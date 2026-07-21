// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {HabitQuestBadges} from "../src/HabitQuestBadges.sol";

contract HabitQuestBadgesTest is Test {
    HabitQuestBadges internal badges;

    address internal owner = makeAddr("owner");
    uint256 internal signerPk = 0xA11CE;
    address internal signerAddr;
    uint256 internal user1Pk = 0xBEEF;
    address internal user1;
    address internal user2 = makeAddr("user2");

    uint256 internal constant BADGE_FIRST_LIGHT = 1;
    string internal constant BADGE_URI = "https://habitquest.dev/api/badges/1";

    function setUp() public {
        signerAddr = vm.addr(signerPk);
        user1 = vm.addr(user1Pk);

        vm.prank(owner);
        badges = new HabitQuestBadges(owner, signerAddr);

        vm.prank(owner);
        badges.setBadgeURI(BADGE_FIRST_LIGHT, BADGE_URI);
    }

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                            */
    /* ------------------------------------------------------------------ */

    function _voucher(address to, uint256 badgeId, uint256 nonce, uint256 expiry)
        internal
        pure
        returns (HabitQuestBadges.MintVoucher memory)
    {
        return HabitQuestBadges.MintVoucher({to: to, badgeId: badgeId, nonce: nonce, expiry: expiry});
    }

    function _digest(HabitQuestBadges.MintVoucher memory v) internal view returns (bytes32) {
        bytes32 typehash = keccak256("MintVoucher(address to,uint256 badgeId,uint256 nonce,uint256 expiry)");
        bytes32 structHash = keccak256(abi.encode(typehash, v.to, v.badgeId, v.nonce, v.expiry));
        return keccak256(abi.encodePacked("\x19\x01", badges.domainSeparator(), structHash));
    }

    function _sign(uint256 pk, HabitQuestBadges.MintVoucher memory v) internal view returns (bytes memory) {
        (uint8 vv, bytes32 r, bytes32 s) = vm.sign(pk, _digest(v));
        return abi.encodePacked(r, s, vv);
    }

    /* ------------------------------------------------------------------ */
    /*  Happy path                                                         */
    /* ------------------------------------------------------------------ */

    function test_ClaimBadge_MintsToRecipient() public {
        HabitQuestBadges.MintVoucher memory v = _voucher(user1, BADGE_FIRST_LIGHT, 1, block.timestamp + 1 hours);
        bytes memory sig = _sign(signerPk, v);

        vm.prank(user1);
        uint256 tokenId = badges.claimBadge(v, sig);

        assertEq(badges.ownerOf(tokenId), user1);
        assertEq(badges.tokenBadgeId(tokenId), BADGE_FIRST_LIGHT);
        assertEq(badges.balanceOf(user1), 1);
        assertEq(badges.tokenURI(tokenId), BADGE_URI);
        assertTrue(badges.hasClaimed(user1, BADGE_FIRST_LIGHT));
    }

    /* ------------------------------------------------------------------ */
    /*  Voucher replay rejection                                           */
    /* ------------------------------------------------------------------ */

    function test_RevertWhen_VoucherReplayed() public {
        HabitQuestBadges.MintVoucher memory v = _voucher(user1, BADGE_FIRST_LIGHT, 42, block.timestamp + 1 hours);
        bytes memory sig = _sign(signerPk, v);

        vm.prank(user1);
        badges.claimBadge(v, sig);

        // Re-submitting the exact same voucher must revert.
        vm.prank(user1);
        vm.expectRevert();
        badges.claimBadge(v, sig);
    }

    /* ------------------------------------------------------------------ */
    /*  Double-claim rejection (fresh voucher, same badge)                 */
    /* ------------------------------------------------------------------ */

    function test_RevertWhen_BadgeClaimedTwiceWithNewVoucher() public {
        HabitQuestBadges.MintVoucher memory v1 = _voucher(user1, BADGE_FIRST_LIGHT, 1, block.timestamp + 1 hours);
        vm.prank(user1);
        badges.claimBadge(v1, _sign(signerPk, v1));

        // A brand-new, validly-signed voucher for the same badge/wallet must still revert.
        HabitQuestBadges.MintVoucher memory v2 = _voucher(user1, BADGE_FIRST_LIGHT, 2, block.timestamp + 1 hours);
        vm.prank(user1);
        vm.expectRevert(HabitQuestBadges.BadgeAlreadyClaimed.selector);
        badges.claimBadge(v2, _sign(signerPk, v2));
    }

    /* ------------------------------------------------------------------ */
    /*  Wrong-signer rejection                                             */
    /* ------------------------------------------------------------------ */

    function test_RevertWhen_SignedByWrongKey() public {
        uint256 attackerPk = 0xBAD;
        HabitQuestBadges.MintVoucher memory v = _voucher(user1, BADGE_FIRST_LIGHT, 1, block.timestamp + 1 hours);
        bytes memory sig = _sign(attackerPk, v);

        vm.prank(user1);
        vm.expectRevert(HabitQuestBadges.InvalidSignature.selector);
        badges.claimBadge(v, sig);
    }

    /* ------------------------------------------------------------------ */
    /*  Soulbound: transfers revert, mint & burn allowed                   */
    /* ------------------------------------------------------------------ */

    function test_RevertWhen_TransferAttempted() public {
        HabitQuestBadges.MintVoucher memory v = _voucher(user1, BADGE_FIRST_LIGHT, 1, block.timestamp + 1 hours);
        vm.prank(user1);
        uint256 tokenId = badges.claimBadge(v, _sign(signerPk, v));

        vm.prank(user1);
        vm.expectRevert(HabitQuestBadges.Soulbound.selector);
        badges.transferFrom(user1, user2, tokenId);
    }

    function test_RevertWhen_SafeTransferAttempted() public {
        HabitQuestBadges.MintVoucher memory v = _voucher(user1, BADGE_FIRST_LIGHT, 1, block.timestamp + 1 hours);
        vm.prank(user1);
        uint256 tokenId = badges.claimBadge(v, _sign(signerPk, v));

        vm.prank(user1);
        vm.expectRevert(HabitQuestBadges.Soulbound.selector);
        badges.safeTransferFrom(user1, user2, tokenId);
    }

    function test_OwnerCanBurnTheirBadge() public {
        HabitQuestBadges.MintVoucher memory v = _voucher(user1, BADGE_FIRST_LIGHT, 1, block.timestamp + 1 hours);
        vm.prank(user1);
        uint256 tokenId = badges.claimBadge(v, _sign(signerPk, v));

        vm.prank(user1);
        badges.burn(tokenId);

        assertEq(badges.balanceOf(user1), 0);
        // Burned badge cannot be re-minted (claim guard persists).
        assertTrue(badges.hasClaimed(user1, BADGE_FIRST_LIGHT));
    }

    function test_RevertWhen_NonOwnerBurns() public {
        HabitQuestBadges.MintVoucher memory v = _voucher(user1, BADGE_FIRST_LIGHT, 1, block.timestamp + 1 hours);
        vm.prank(user1);
        uint256 tokenId = badges.claimBadge(v, _sign(signerPk, v));

        vm.prank(user2);
        vm.expectRevert(HabitQuestBadges.NotTokenOwner.selector);
        badges.burn(tokenId);
    }

    /* ------------------------------------------------------------------ */
    /*  Expiry, recipient binding, unconfigured badge                      */
    /* ------------------------------------------------------------------ */

    function test_RevertWhen_VoucherExpired() public {
        HabitQuestBadges.MintVoucher memory v = _voucher(user1, BADGE_FIRST_LIGHT, 1, block.timestamp + 1 hours);
        bytes memory sig = _sign(signerPk, v);

        vm.warp(block.timestamp + 2 hours);
        vm.prank(user1);
        vm.expectRevert(HabitQuestBadges.VoucherExpired.selector);
        badges.claimBadge(v, sig);
    }

    function test_RevertWhen_WrongRecipientSubmits() public {
        HabitQuestBadges.MintVoucher memory v = _voucher(user1, BADGE_FIRST_LIGHT, 1, block.timestamp + 1 hours);
        bytes memory sig = _sign(signerPk, v);

        // user2 tries to use a voucher issued to user1.
        vm.prank(user2);
        vm.expectRevert(HabitQuestBadges.WrongRecipient.selector);
        badges.claimBadge(v, sig);
    }

    function test_RevertWhen_BadgeNotConfigured() public {
        uint256 unconfigured = 999;
        HabitQuestBadges.MintVoucher memory v = _voucher(user1, unconfigured, 1, block.timestamp + 1 hours);
        bytes memory sig = _sign(signerPk, v);

        vm.prank(user1);
        vm.expectRevert(HabitQuestBadges.BadgeNotConfigured.selector);
        badges.claimBadge(v, sig);
    }

    /* ------------------------------------------------------------------ */
    /*  Admin: signer rotation                                             */
    /* ------------------------------------------------------------------ */

    function test_SignerRotation_OldSignerRejected_NewSignerAccepted() public {
        uint256 newSignerPk = 0xC0FFEE;
        address newSigner = vm.addr(newSignerPk);

        vm.prank(owner);
        badges.setSigner(newSigner);

        // Old signer no longer works.
        HabitQuestBadges.MintVoucher memory v = _voucher(user1, BADGE_FIRST_LIGHT, 1, block.timestamp + 1 hours);
        vm.prank(user1);
        vm.expectRevert(HabitQuestBadges.InvalidSignature.selector);
        badges.claimBadge(v, _sign(signerPk, v));

        // New signer works.
        vm.prank(user1);
        badges.claimBadge(v, _sign(newSignerPk, v));
        assertEq(badges.balanceOf(user1), 1);
    }

    function test_RevertWhen_NonOwnerSetsBadgeURI() public {
        vm.prank(user2);
        vm.expectRevert();
        badges.setBadgeURI(2, "https://habitquest.dev/api/badges/2");
    }

    function test_RevertWhen_NonOwnerSetsSigner() public {
        vm.prank(user2);
        vm.expectRevert();
        badges.setSigner(user2);
    }
}
