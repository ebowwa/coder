// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleNFT
 * @dev ERC721 NFT implementation with minting capabilities
 *      Name: "DAppNFT", Symbol: "DNFT"
 *      Written from scratch following OpenZeppelin patterns
 */
contract SimpleNFT {
    // Token metadata
    string public constant name = "DAppNFT";
    string public constant symbol = "DNFT";

    // State variables
    address public owner;
    uint256 private _tokenIdCounter;

    // Mappings for token ownership and approvals
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(uint256 => string) private _tokenURIs;

    // Events (ERC721 standard)
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // Errors
    error NotOwner(address caller);
    error NotApprovedOrOwner(address caller, uint256 tokenId);
    error InvalidTokenId(uint256 tokenId);
    error TransferToZeroAddress();
    error TransferFromIncorrectOwner(address from, uint256 tokenId);
    error MintToZeroAddress();
    error TokenAlreadyMinted(uint256 tokenId);
    error ApprovalToCurrentOwner();
    error ApproveCallerIsNotOwnerNorApprovedForAll();
    error QueryForNonexistentToken();

    /**
     * @dev Constructor sets deployer as owner and initializes counter
     */
    constructor() {
        owner = msg.sender;
        _tokenIdCounter = 0;
        emit OwnershipTransferred(address(0), owner);
    }

    // ============ Modifiers ============

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert NotOwner(msg.sender);
        }
        _;
    }

    // ============ View Functions ============

    /**
     * @dev Returns the current token counter (next token ID to be minted)
     */
    function currentTokenId() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Returns the total number of tokens minted
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Returns the owner of a token
     * @param tokenId The token ID to query
     */
    function ownerOf(uint256 tokenId) external view returns (address) {
        address tokenOwner = _owners[tokenId];
        if (tokenOwner == address(0)) {
            revert QueryForNonexistentToken();
        }
        return tokenOwner;
    }

    /**
     * @dev Returns the balance (NFT count) of an address
     * @param tokenOwner The address to query
     */
    function balanceOf(address tokenOwner) external view returns (uint256) {
        require(tokenOwner != address(0), "SimpleNFT: balance query for zero address");
        return _balances[tokenOwner];
    }

    /**
     * @dev Returns the approved address for a token
     * @param tokenId The token ID to query
     */
    function getApproved(uint256 tokenId) external view returns (address) {
        if (_owners[tokenId] == address(0)) {
            revert InvalidTokenId(tokenId);
        }
        return _tokenApprovals[tokenId];
    }

    /**
     * @dev Returns whether an operator is approved for all tokens of an owner
     * @param tokenOwner The address owning the tokens
     * @param operator The address to check approval for
     */
    function isApprovedForAll(address tokenOwner, address operator) external view returns (bool) {
        return _operatorApprovals[tokenOwner][operator];
    }

    /**
     * @dev Returns the token URI for a given token ID
     * @param tokenId The token ID to query
     */
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        if (_owners[tokenId] == address(0)) {
            revert InvalidTokenId(tokenId);
        }
        return _tokenURIs[tokenId];
    }

    /**
     * @dev Returns the base URI (can be overridden for metadata prefix)
     */
    function baseURI() public pure returns (string memory) {
        return "";
    }

    /**
     * @dev ERC165 interface support
     * @param interfaceId The interface identifier
     */
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x01ffc9a7 || // ERC165
            interfaceId == 0x80ac58cd || // ERC721
            interfaceId == 0x5b5e139f;   // ERC721Metadata
    }

    // ============ ERC721 Core Functions ============

    /**
     * @dev Safely transfer a token from one address to another
     * @param from The source address
     * @param to The destination address
     * @param tokenId The token ID to transfer
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external {
        _safeTransfer(from, to, tokenId, "");
    }

    /**
     * @dev Safely transfer a token with data
     * @param from The source address
     * @param to The destination address
     * @param tokenId The token ID to transfer
     * @param data Additional data to pass to receiver
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata data
    ) external {
        _safeTransfer(from, to, tokenId, data);
    }

    /**
     * @dev Transfer a token from one address to another
     * @param from The source address
     * @param to The destination address
     * @param tokenId The token ID to transfer
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external {
        if (!_isApprovedOrOwner(msg.sender, tokenId)) {
            revert NotApprovedOrOwner(msg.sender, tokenId);
        }
        _transfer(from, to, tokenId);
    }

    /**
     * @dev Approve another address to transfer a token
     * @param to The address to approve
     * @param tokenId The token ID
     */
    function approve(address to, uint256 tokenId) external {
        address tokenOwner = _owners[tokenId];
        if (to == tokenOwner) {
            revert ApprovalToCurrentOwner();
        }
        if (msg.sender != tokenOwner && !_operatorApprovals[tokenOwner][msg.sender]) {
            revert ApproveCallerIsNotOwnerNorApprovedForAll();
        }
        _approve(to, tokenId);
    }

    /**
     * @dev Set or unset approval for all tokens for an operator
     * @param operator The address to approve/unapprove
     * @param approved Whether to approve or unapprove
     */
    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    // ============ Mint Function ============

    /**
     * @dev Mint a new NFT to a specified address (owner only)
     * @param to The address to receive the NFT
     * @param uri The token URI for metadata
     * @return tokenId The ID of the newly minted token
     */
    function mint(address to, string calldata uri) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _safeMint(to, tokenId, uri);
        _tokenIdCounter++;
        return tokenId;
    }

    /**
     * @dev Safely mint a new NFT (checks if recipient can receive ERC721)
     * @param to The address to receive the NFT
     * @param uri The token URI for metadata
     * @return tokenId The ID of the newly minted token
     */
    function safeMint(address to, string calldata uri) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _safeMint(to, tokenId, uri);
        _tokenIdCounter++;

        // Check if recipient can receive ERC721
        if (_isContract(to)) {
            try IERC721Receiver(to).onERC721Received(msg.sender, address(0), tokenId, "") returns (bytes4 retval) {
                require(retval == IERC721Receiver.onERC721Received.selector, "SimpleNFT: ERC721Receiver rejected");
            } catch {
                revert("SimpleNFT: transfer to non ERC721Receiver");
            }
        }

        return tokenId;
    }

    // ============ Ownership Functions ============

    /**
     * @dev Transfer contract ownership to a new address
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "SimpleNFT: new owner is zero address");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    // ============ Internal Functions ============

    /**
     * @dev Check if an address is a contract
     */
    function _isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    /**
     * @dev Check if an address is approved or owner of a token
     */
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address tokenOwner = _owners[tokenId];
        return (spender == tokenOwner ||
                _tokenApprovals[tokenId] == spender ||
                _operatorApprovals[tokenOwner][spender]);
    }

    /**
     * @dev Internal transfer function
     */
    function _transfer(address from, address to, uint256 tokenId) internal {
        if (_owners[tokenId] != from) {
            revert TransferFromIncorrectOwner(from, tokenId);
        }
        if (to == address(0)) {
            revert TransferToZeroAddress();
        }

        // Clear approvals
        _approve(address(0), tokenId);

        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    /**
     * @dev Internal safe transfer function
     */
    function _safeTransfer(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) internal {
        if (!_isApprovedOrOwner(msg.sender, tokenId)) {
            revert NotApprovedOrOwner(msg.sender, tokenId);
        }
        _transfer(from, to, tokenId);

        // Check if recipient can receive ERC721
        if (_isContract(to)) {
            try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 retval) {
                require(retval == IERC721Receiver.onERC721Received.selector, "SimpleNFT: ERC721Receiver rejected");
            } catch {
                revert("SimpleNFT: transfer to non ERC721Receiver");
            }
        }
    }

    /**
     * @dev Internal mint function
     */
    function _safeMint(address to, uint256 tokenId, string memory uri) internal {
        if (to == address(0)) {
            revert MintToZeroAddress();
        }
        if (_owners[tokenId] != address(0)) {
            revert TokenAlreadyMinted(tokenId);
        }

        _balances[to] += 1;
        _owners[tokenId] = to;
        _tokenURIs[tokenId] = uri;

        emit Transfer(address(0), to, tokenId);
    }

    /**
     * @dev Internal approve function
     */
    function _approve(address to, uint256 tokenId) internal {
        _tokenApprovals[tokenId] = to;
        emit Approval(_owners[tokenId], to, tokenId);
    }
}

/**
 * @dev Interface for contracts that receive ERC721 tokens
 */
interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}
