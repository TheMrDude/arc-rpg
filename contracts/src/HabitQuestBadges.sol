// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title HabitQuestBadges
 * @notice Soulbound (non-transferable) ERC-721 "Legendary Badges" that
 *         commemorate real HabitQuest milestones.
 *
 * Design philosophy (mirrors the app's anti-guilt brand promise):
 *   - Badges are permanent trophies. They can never be revoked or expired by
 *     anyone. The only way a badge leaves a wallet is if the owner themselves
 *     chooses to burn it (user sovereignty).
 *   - Badges are claimed, never pushed. The app never holds user keys and the
 *     server never pays gas. Eligibility is proven off-chain by the HabitQuest
 *     backend, which signs an EIP-712 voucher; the holder submits it here and
 *     pays their own (tiny, Base L2) gas.
 *
 * Mint flow (signed-voucher lazy mint):
 *   1. A milestone unlocks in-app.
 *   2. The `sign-badge-voucher` Edge Function re-verifies the milestone against
 *      the user's actual habit data and signs a {MintVoucher} with the backend
 *      signer key.
 *   3. The user calls {claimBadge} with the voucher + signature. The contract
 *      verifies the signature, enforces one-badge-per-wallet and per-voucher
 *      replay protection, and mints.
 */
contract HabitQuestBadges is ERC721, EIP712, Ownable {
    /// @notice The off-chain voucher signed by the HabitQuest backend signer.
    /// @param to       The wallet allowed to claim (bound so a voucher can't be replayed by another address).
    /// @param badgeId  Which badge (1..5 in v1). Maps to a metadata URI set by the owner.
    /// @param nonce    Unique per issued voucher; provides per-voucher replay protection.
    /// @param expiry   Unix timestamp after which the voucher is no longer valid.
    struct MintVoucher {
        address to;
        uint256 badgeId;
        uint256 nonce;
        uint256 expiry;
    }

    bytes32 private constant VOUCHER_TYPEHASH =
        keccak256("MintVoucher(address to,uint256 badgeId,uint256 nonce,uint256 expiry)");

    /// @notice Address whose signatures authorize mints. Rotatable by the owner.
    address public signer;

    /// @dev Monotonic token id counter. Token ids start at 1.
    uint256 private _nextTokenId = 1;

    /// @notice badgeId => ERC-721 metadata URI (e.g. https://habitquest.dev/api/badges/1)
    mapping(uint256 => string) private _badgeMetadataURI;

    /// @notice tokenId => badgeId, so tokenURI can resolve the shared per-badge metadata.
    mapping(uint256 => uint256) public tokenBadgeId;

    /// @notice Per-voucher replay guard, keyed by keccak256(to, badgeId, nonce).
    mapping(bytes32 => bool) public voucherUsed;

    /// @notice One badge type per wallet: prevents claiming the same badge twice
    ///         even with a fresh (differently-nonced) voucher.
    mapping(address => mapping(uint256 => bool)) public hasClaimed;

    event BadgeClaimed(address indexed to, uint256 indexed badgeId, uint256 indexed tokenId);
    event SignerUpdated(address indexed previousSigner, address indexed newSigner);
    event BadgeURISet(uint256 indexed badgeId, string uri);

    error InvalidSigner();
    error InvalidSignature();
    error VoucherExpired();
    error VoucherAlreadyUsed();
    error BadgeAlreadyClaimed();
    error BadgeNotConfigured();
    error WrongRecipient();
    error Soulbound();
    error NotTokenOwner();

    /**
     * @param initialOwner  Owner (can set badge URIs and rotate the signer). Dan's deployer/admin.
     * @param initialSigner Backend signer address whose vouchers authorize mints.
     */
    constructor(address initialOwner, address initialSigner)
        ERC721("HabitQuest Legendary Badges", "HQBADGE")
        EIP712("HabitQuestBadges", "1")
        Ownable(initialOwner)
    {
        if (initialSigner == address(0)) revert InvalidSigner();
        signer = initialSigner;
        emit SignerUpdated(address(0), initialSigner);
    }

    /**
     * @notice Claim a badge with a backend-signed voucher. Caller pays gas.
     * @dev Reverts on: expired voucher, already-claimed badge (per wallet),
     *      replayed voucher (per nonce), unconfigured badge, wrong recipient,
     *      or a signature not produced by the current {signer}.
     * @return tokenId The newly minted token id.
     */
    function claimBadge(MintVoucher calldata voucher, bytes calldata signature) external returns (uint256) {
        if (voucher.to != msg.sender) revert WrongRecipient();
        if (block.timestamp > voucher.expiry) revert VoucherExpired();
        if (hasClaimed[voucher.to][voucher.badgeId]) revert BadgeAlreadyClaimed();

        bytes32 voucherKey = keccak256(abi.encode(voucher.to, voucher.badgeId, voucher.nonce));
        if (voucherUsed[voucherKey]) revert VoucherAlreadyUsed();

        if (bytes(_badgeMetadataURI[voucher.badgeId]).length == 0) revert BadgeNotConfigured();

        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(VOUCHER_TYPEHASH, voucher.to, voucher.badgeId, voucher.nonce, voucher.expiry))
        );
        if (ECDSA.recover(digest, signature) != signer) revert InvalidSignature();

        // Effects before interactions (mint) — replay/claim guards set first.
        voucherUsed[voucherKey] = true;
        hasClaimed[voucher.to][voucher.badgeId] = true;

        uint256 tokenId = _nextTokenId++;
        tokenBadgeId[tokenId] = voucher.badgeId;

        _safeMint(voucher.to, tokenId);
        emit BadgeClaimed(voucher.to, voucher.badgeId, tokenId);
        return tokenId;
    }

    /**
     * @notice Burn a badge you own. This is the ONLY way a badge can ever leave
     *         a wallet — no app, company, or server can take it from you. Burning
     *         does not clear the per-wallet claim guard, so a burned badge cannot
     *         be re-minted.
     */
    function burn(uint256 tokenId) external {
        if (_ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        _burn(tokenId);
    }

    /// @inheritdoc ERC721
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _badgeMetadataURI[tokenBadgeId[tokenId]];
    }

    /// @notice The metadata URI configured for a badge type (empty if unset).
    function badgeURI(uint256 badgeId) external view returns (string memory) {
        return _badgeMetadataURI[badgeId];
    }

    /// @notice Owner-only: point a badgeId at its metadata URI.
    function setBadgeURI(uint256 badgeId, string calldata uri) external onlyOwner {
        _badgeMetadataURI[badgeId] = uri;
        emit BadgeURISet(badgeId, uri);
    }

    /// @notice Owner-only: rotate the backend signer (e.g. key rotation / compromise).
    function setSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert InvalidSigner();
        emit SignerUpdated(signer, newSigner);
        signer = newSigner;
    }

    /// @notice The EIP-712 domain separator, exposed for off-chain signers/tests.
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev Soulbound enforcement. OZ 5.x routes every mint/transfer/burn through
     *      {_update}. We allow mints (from == 0) and burns (to == 0) but revert
     *      any owner-to-owner transfer.
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }
}
