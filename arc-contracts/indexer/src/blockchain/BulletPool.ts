export const bulletPoolAbi = [
  {
    type: "event",
    name: "Deposit",
    inputs: [
      {name: "commitment", type: "bytes32", indexed: true},
      {name: "leafIndex", type: "uint32", indexed: true},
      {name: "token", type: "address", indexed: true},
      {name: "amount", type: "uint256", indexed: false},
    ],
  },
  {
    type: "function",
    name: "depositCounter",
    stateMutability: "view",
    inputs: [],
    outputs: [{name: "", type: "uint32"}],
  },
] as const;

export const merkleRootManagerAbi = [
  {
    type: "function",
    name: "postRoot",
    stateMutability: "nonpayable",
    inputs: [{name: "root", type: "bytes32"}],
    outputs: [],
  },
  {
    type: "function",
    name: "isKnownRoot",
    stateMutability: "view",
    inputs: [{name: "root", type: "bytes32"}],
    outputs: [{name: "", type: "bool"}],
  },
  {
    type: "function",
    name: "latestRoot",
    stateMutability: "view",
    inputs: [],
    outputs: [{name: "", type: "bytes32"}],
  },
] as const;
