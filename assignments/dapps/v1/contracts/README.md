# DApp Smart Contracts

Solidity smart contracts for the DApp ecosystem.

## Contracts

### SimpleStorage.sol
A simple storage contract that stores and retrieves a uint256 value.

**Features:**
- Store and retrieve uint256 values
- Owner-only access control
- Event emission on value changes
- Ownership transfer functionality

**Functions:**
| Function | Description | Access |
|----------|-------------|--------|
| `setValue(uint256)` | Store a new value | Owner only |
| `getValue()` | Retrieve stored value | Public |
| `transferOwnership(address)` | Transfer contract ownership | Owner only |
| `renounceOwnership()` | Renounce ownership permanently | Owner only |

**Events:**
- `ValueChanged(uint256 oldValue, uint256 newValue, address changedBy)`
- `OwnershipTransferred(address previousOwner, address newOwner)`

---

### SimpleToken.sol (ERC20)
A fully-featured ERC20 token implementation.

**Token Details:**
- **Name:** DAppToken
- **Symbol:** DAPP
- **Decimals:** 18
- **Initial Supply:** 1,000,000 tokens

**Features:**
- Standard ERC20 functions (transfer, approve, transferFrom)
- Mintable by owner
- Burnable by holders
- Owner-only minting control

**Functions:**
| Function | Description | Access |
|----------|-------------|--------|
| `transfer(address, uint256)` | Transfer tokens | Public |
| `approve(address, uint256)` | Approve spender | Public |
| `transferFrom(address, address, uint256)` | Transfer with allowance | Public |
| `mint(address, uint256)` | Mint new tokens | Owner only |
| `burn(uint256)` | Burn own tokens | Public |
| `burnFrom(address, uint256)` | Burn from address | Owner only |

**Events:**
- `Transfer(address from, address to, uint256 value)`
- `Approval(address owner, address spender, uint256 value)`
- `Mint(address to, uint256 value)`
- `Burn(address from, uint256 value)`

---

### SimpleNFT.sol (ERC721)
A fully-featured ERC721 NFT implementation.

**Token Details:**
- **Name:** DAppNFT
- **Symbol:** DNFT

**Features:**
- Standard ERC721 functions (transfer, approve, setApprovalForAll)
- Safe transfer support
- Token URI support for metadata
- Auto-incrementing token IDs
- Owner-only minting

**Functions:**
| Function | Description | Access |
|----------|-------------|--------|
| `mint(address, string)` | Mint new NFT | Owner only |
| `safeMint(address, string)` | Safe mint with receiver check | Owner only |
| `safeTransferFrom(...)` | Safe transfer | Approved/Owner |
| `transferFrom(...)` | Transfer NFT | Approved/Owner |
| `approve(address, uint256)` | Approve for token | Public |
| `setApprovalForAll(address, bool)` | Set operator approval | Public |
| `tokenURI(uint256)` | Get token metadata | Public |

**Events:**
- `Transfer(address from, address to, uint256 tokenId)`
- `Approval(address owner, address approved, uint256 tokenId)`
- `ApprovalForAll(address owner, address operator, bool approved)`

---

## Compilation

Using Hardhat:
```bash
npx hardhat compile
```

Using Foundry:
```bash
forge build
```

Using solc directly:
```bash
solc --optimize --bin --abi contracts/SimpleStorage.sol -o build/
```

## Deployment

See `scripts/deploy.ts` for deployment logic.

## License

MIT
