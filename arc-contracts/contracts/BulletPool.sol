// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IVerifier} from "./interfaces/IVerifier.sol";
import {IMerkleRootManager} from "./interfaces/IMerkleRootManager.sol";

/// @title BulletPool
/// @notice ZK-private payment pool: deposit notes, withdraw with membership proofs.
/// @dev Option B — Merkle tree is off-chain. Public inputs match zk/PROTOCOL.md:
///      [root, nullifier, recipientDigest, amount, tokenHash]
///      where tokenHash = uint256(uint160(token)).
contract BulletPool is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct TokenInfo {
        bool registered;
        bool enabled;
        uint8 decimals;
    }

    IVerifier public verifier;
    IMerkleRootManager public rootManager;

    mapping(address => TokenInfo) public supportedTokens;
    mapping(bytes32 => bool) public nullifierSpent;
    uint32 public depositCounter;

    error InvalidToken();
    error InvalidAmount();
    error InvalidCommitment();
    error InvalidRecipient();
    error InvalidProof();
    error RootNotFound();
    error NullifierAlreadyUsed();
    error ZeroAddress();
    error TokenAlreadySupported();
    error TokenNotSupported();

    event Deposit(
        bytes32 indexed commitment,
        uint32 indexed leafIndex,
        address indexed token,
        uint256 amount
    );

    event Withdrawal(bytes32 indexed nullifier, address indexed recipient);

    event TokenAdded(address indexed token, uint8 decimals);
    event TokenRemoved(address indexed token);
    event VerifierUpdated(address indexed previous, address indexed current);
    event RootManagerUpdated(address indexed previous, address indexed current);

    constructor(
        address initialOwner,
        address verifier_,
        address rootManager_
    ) Ownable(initialOwner) {
        if (verifier_ == address(0) || rootManager_ == address(0)) revert ZeroAddress();
        verifier = IVerifier(verifier_);
        rootManager = IMerkleRootManager(rootManager_);
    }

    function addToken(address token, uint8 decimals_) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        TokenInfo storage info = supportedTokens[token];
        if (info.enabled) revert TokenAlreadySupported();

        info.registered = true;
        info.enabled = true;
        info.decimals = decimals_;
        emit TokenAdded(token, decimals_);
    }

    function removeToken(address token) external onlyOwner {
        TokenInfo storage info = supportedTokens[token];
        if (!info.enabled) revert TokenNotSupported();
        info.enabled = false;
        emit TokenRemoved(token);
    }

    function isSupported(address token) external view returns (bool) {
        return supportedTokens[token].enabled;
    }

    /// @notice Field encoding of an ERC-20 address for the circuit `tokenHash` input.
    function tokenHashOf(address token) public pure returns (uint256) {
        return uint256(uint160(token));
    }

    function deposit(
        address token,
        uint256 amount,
        bytes32 commitment
    ) external nonReentrant whenNotPaused returns (uint32 leafIndex) {
        if (!supportedTokens[token].enabled) revert InvalidToken();
        if (amount == 0) revert InvalidAmount();
        if (commitment == bytes32(0)) revert InvalidCommitment();

        leafIndex = depositCounter;
        unchecked {
            depositCounter = leafIndex + 1;
        }

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit Deposit(commitment, leafIndex, token, amount);
    }

    /// @notice Withdraw a note by proving membership under a known root.
    /// @param recipientDigest Stealth digest bound in the note commitment (public input).
    /// @param recipient Address that receives the ERC-20 payout.
    function withdraw(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifier,
        bytes32 recipientDigest,
        address recipient,
        address token,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        if (nullifier == bytes32(0)) revert InvalidProof();
        if (recipientDigest == bytes32(0)) revert InvalidProof();
        if (!supportedTokens[token].registered) revert InvalidToken();
        if (!rootManager.isKnownRoot(root)) revert RootNotFound();
        if (nullifierSpent[nullifier]) revert NullifierAlreadyUsed();

        uint256 tokenHash = tokenHashOf(token);
        if (
            !verifier.verifyProof(
                proof,
                root,
                nullifier,
                recipientDigest,
                amount,
                tokenHash
            )
        ) {
            revert InvalidProof();
        }

        nullifierSpent[nullifier] = true;

        IERC20(token).safeTransfer(recipient, amount);

        emit Withdrawal(nullifier, recipient);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setVerifier(address verifier_) external onlyOwner {
        if (verifier_ == address(0)) revert ZeroAddress();
        address previous = address(verifier);
        verifier = IVerifier(verifier_);
        emit VerifierUpdated(previous, verifier_);
    }

    function setRootManager(address rootManager_) external onlyOwner {
        if (rootManager_ == address(0)) revert ZeroAddress();
        address previous = address(rootManager);
        rootManager = IMerkleRootManager(rootManager_);
        emit RootManagerUpdated(previous, rootManager_);
    }
}
