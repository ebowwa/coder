# Smart Contract Improvements

## 1. SimpleStorage.sol - Enhancements Needed

### Current Issues:
- No reentrancy protection on state changes
- Missing pausable functionality for emergency stops
- No input validation on setValue (e.g., max value)
- Lack of role-based access control (single point of failure)

### Proposed Changes:
```solidity
// Add reentrancy guard
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Add Pausable
import "@openzeppelin/contracts/utils/Pausable.sol";

// Add AccessControl for multi-role support
import "@openzeppelin/contracts/access/AccessControl.sol";

contract SimpleStorage is ReentrancyGuard, Pausable, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    uint256 public constant MAX_VALUE = type(uint256).max;

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Not admin");
        _;
    }

    function setValue(uint256 _value) 
        external 
        onlyRole(OPERATOR_ROLE) 
        whenNotPaused 
        nonReentrant 
    {
        require(_value > 0, "Value must be positive");
        uint256 oldValue = storedValue;
        storedValue = _value;
        emit ValueChanged(oldValue, _value, msg.sender);
    }

    function pause() external onlyAdmin {
        _pause();
    }

    function unpause() external onlyAdmin {
        _unpause();
    }
}
```

## 2. SimpleToken.sol - Enhancements Needed

### Current Issues:
- Missing permit functionality (gasless approvals)
- No flash loan protection
- Lack of time-based vesting or locking mechanisms
- No burn limit checks
- Missing whitelist/blacklist functionality

### Proposed Changes:
```solidity
// Add EIP-2612 permit support
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract SimpleToken is ERC20Permit, ERC20Votes {
    
    // Add permit for gasless approvals
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public override {
        // Implementation for off-chain approvals
    }

    // Add vesting schedule
    mapping(address => VestingSchedule) public vesting;

    struct VestingSchedule {
        uint256 totalAmount;
        uint256 claimedAmount;
        uint256 startTime;
        uint256 duration;
        bool exists;
    }

    // Add time lock on transfers
    mapping(address => uint256) public transferLockUntil;

    // Add blacklist
    mapping(address => bool) public isBlacklisted;

    modifier notBlacklisted(address _account) {
        require(!isBlacklisted[_account], "Account is blacklisted");
        _;
    }

    function transfer(address to, uint256 amount) 
        public 
        override 
        notBlacklisted(msg.sender) 
        notBlacklisted(to) 
        returns (bool) 
    {
        require(block.timestamp >= transferLockUntil[msg.sender], "Transfer locked");
        return super.transfer(to, amount);
    }
}
```

## 3. SimpleNFT.sol - Enhancements Needed

### Current Issues:
- Missing batch minting (gas inefficient)
- No royalty support (EIP-2981)
- Lack of lazy minting (mint-on-demand)
- No burning capability
- Missing token enumeration
- No metadata URI validation

### Proposed Changes:
```solidity
// Add ERC721Enumerable for better tracking
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

// Add ERC721Royalty for creator royalties
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";

// Add ERC721Burnable for token burning
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";

contract SimpleNFT is 
    ERC721Enumerable, 
    ERC721Royalty, 
    ERC721Burnable 
{
    // Batch minting
    function batchMint(
        address[] calldata recipients, 
        string[] calldata uris
    ) external onlyOwner {
        require(recipients.length == uris.length, "Length mismatch");
        require(recipients.length <= 50, "Too many mints");

        for (uint256 i = 0; i < recipients.length; i++) {
            _safeMint(recipients[i], _tokenIdCounter, uris[i]);
            _tokenIdCounter++;
        }
    }

    // Lazy minting (marketplace can mint later)
    mapping(bytes32 => bool) public usedVouchers;

    struct MintVoucher {
        address redeemer;
        uint256 tokenId;
        string uri;
        bytes signature;
    }

    function lazyMint(MintVoucher calldata voucher) external {
        bytes32 digest = keccak256(abi.encode(voucher));
        require(!usedVouchers[digest], "Voucher used");
        require(owner == recoverSigner(digest, voucher.signature), "Invalid sig");

        usedVouchers[digest] = true;
        _safeMint(voucher.redeemer, voucher.tokenId, voucher.uri);
    }

    // URI validation
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override 
        returns (string memory) 
    {
        require(_exists(tokenId), "No token");
        string memory uri = _tokenURIs[tokenId];
        require(
            bytes(uri).length > 0 && uri.startsWith("ipfs://"),
            "Invalid URI format"
        );
        return uri;
    }

    // Set default royalty (5%)
    constructor() {
        _setDefaultRoyalty(owner, 500); // 500 basis points = 5%
    }
}
```

## 4. Security Enhancements Needed

### Add to all contracts:
```solidity
// 1. Emergency withdrawal
function emergencyWithdraw ETH() external onlyOwner {
    payable(owner).transfer(address(this).balance);
}

// 2. Circuit breaker pattern
uint256 public circuitBreakerThreshold;
uint256 public circuitBreakerCooldown;

modifier circuitBreaker() {
    require(
        block.timestamp >= circuitBreakerCooldown,
        "Circuit breaker active"
    );
    _;
    if (gasleft() < circuitBreakerThreshold) {
        circuitBreakerCooldown = block.timestamp + 1 days;
    }
}

// 3. Time-based access control
mapping(address => uint256) public accessUntil;

modifier hasTimeAccess() {
    require(block.timestamp < accessUntil[msg.sender], "Access expired");
    _;
}

// 4. Rate limiting
mapping(address => uint256) public lastCallTime;
uint256 public constant RATE_LIMIT = 1 minutes;

modifier rateLimited() {
    require(
        block.timestamp >= lastCallTime[msg.sender] + RATE_LIMIT,
        "Rate limit exceeded"
    );
    lastCallTime[msg.sender] = block.timestamp;
    _;
}
```

## 5. Gas Optimization Strategies

```solidity
// 1. Use calldata instead of memory
function batchTransfer(address[] calldata recipients, uint256[] calldata amounts)
    external
    calldata
{
    // calldata is cheaper than memory for read-only args
}

// 2. Use custom errors (already done ✓)

// 3. Short circuit modifiers
function setValue(uint256 _value) external onlyOwner whenNotPaused {
    // Place whenNotPaused after onlyOwner for gas savings
}

// 4. Pack structs
struct PackedData {
    uint128 value1;  // 16 bytes
    uint64 value2;   // 8 bytes
    uint32 value3;   // 4 bytes
    bool flag;       // 1 byte
    // Total: 29 bytes, fits in 32-byte slot
}

// 5. Use unchecked for safe operations
function increment() external {
    uint256 current = counter;
    unchecked {
        counter = current + 1; // Safe from overflow
    }
}
```

## 6. Upgradeability Pattern

```solidity
// Use UUPS proxy pattern
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract SimpleStorageUpgradeable is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable
{
    function initialize() public initializer {
        __Ownable_init();
        owner = msg.sender;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
```

## 7. Testing Requirements

```solidity
// Test coverage should include:
// 1. Reentrancy attacks
// 2. Access control bypass attempts
// 3. Edge cases (max uint256, zero address, etc.)
// 4. Gas limit scenarios
// 5. Upgrade scenarios
// 6. Pause/unpause functionality
// 7. Role-based permissions
// 8. Blacklist/whitelist enforcement

// Hardhat test example:
describe("Reentrancy", function () {
    it("Should prevent reentrancy on setValue", async function () {
        const Attacker = await ethers.getContractFactory("ReentrancyAttacker");
        const attacker = await Attacker.deploy(storage.address);
        await expect(attacker.attack()).to.be.revertedWithCustomError(
            storage, "ReentrancyGuardReentrantCall"
        );
    });
});
```

## 8. Audit Checklist

- [ ] ReentrancyGuard on all external state-changing functions
- [ ] Pausable for emergency stops
- [ ] AccessControl for role-based permissions
- [ ] Input validation on all public functions
- [ ] Events emitted for all state changes
- [ ] Custom errors for gas optimization
- [ ] NatSpec comments for all functions
- [ ] Circuit breaker pattern implemented
- [ ] Rate limiting on sensitive functions
- [ ] Upgradeability pattern (UUPS preferred)
- [ ] Comprehensive test suite (>90% coverage)
- [ ] Manual code review
- [ ] Automated analysis (Slither, Mythril)
- [ ] Third-party audit before mainnet
