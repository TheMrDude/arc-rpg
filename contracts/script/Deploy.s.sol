// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {HabitQuestBadges} from "../src/HabitQuestBadges.sol";

/**
 * @title Deploy
 * @notice Deploys HabitQuestBadges and wires up the five v1 badge metadata URIs.
 *
 * NOTE: This script is written but intentionally NOT run in CI. Dan runs it
 * manually with his own keys. See contracts/README.md for the exact commands
 * for Base Sepolia (testnet, first) and Base mainnet.
 *
 * Required env vars:
 *   PRIVATE_KEY        - deployer key (also becomes the contract owner unless BADGE_OWNER is set)
 *   BADGE_SIGNER       - backend signer address (matches BADGE_SIGNER_PRIVATE_KEY in Supabase)
 *   BADGE_OWNER        - (optional) owner/admin address; defaults to the deployer
 *   METADATA_BASE_URI  - (optional) base URL for metadata; defaults to https://habitquest.dev/api/badges
 */
contract Deploy is Script {
    function run() external returns (HabitQuestBadges badges) {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");
        address signer = vm.envAddress("BADGE_SIGNER");
        address owner = vm.envOr("BADGE_OWNER", vm.addr(deployerPk));
        string memory baseUri = vm.envOr("METADATA_BASE_URI", string("https://habitquest.dev/api/badges"));

        vm.startBroadcast(deployerPk);

        badges = new HabitQuestBadges(owner, signer);

        // v1 badge set (badgeId => metadata route). Keep in sync with lib/badges.js.
        for (uint256 badgeId = 1; badgeId <= 5; badgeId++) {
            badges.setBadgeURI(badgeId, string.concat(baseUri, "/", vm.toString(badgeId)));
        }

        vm.stopBroadcast();

        console2.log("HabitQuestBadges deployed at:", address(badges));
        console2.log("Owner:", owner);
        console2.log("Signer:", signer);
        console2.log("Metadata base:", baseUri);
    }
}
