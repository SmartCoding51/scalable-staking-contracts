// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  /**
  * Deploy staking token on the BSC testnet
  */
  const stakingTokenOwner = "0x488177c42bD58104618cA771A674Ba7e4D5A2FBB";
  const rewardTokenOwner = "0x87682fEE6dbC7A4475b5E1352c7C663306B2e028";
  const feeReceiver = "0x7822cff724E46fd3AD7F6369A81364521Bf7d924";

  const StakingToken = await ethers.getContractFactory("MockERC20");
  const stakingToken = await StakingToken.deploy(
    "NaVe Finance", 
    "NAVE", 
    18,
    250000000,
    stakingTokenOwner
  );
  await stakingToken.deployed();

  /**
   * Deploy reward token on the BSC testnet
   */
   const RewardToken = await ethers.getContractFactory("MockERC20");
   const rewardToken = await RewardToken.deploy(
     "BUSD Token", 
     "BUSD", 
     18,
     100000000,
     rewardTokenOwner
   );
   await rewardToken.deployed();
 
   // BUSD, reward token on the BSC testnet
   // const BUSD = "0x8301F2213c0eeD49a7E28Ae4c3e91722919B8B47";
 
   // We get the contract to deploy
   const Staking = await ethers.getContractFactory("Staking");
   const staking = await Staking.deploy(
     //naveToken.address, rewardToken.address
     "0x146Ec10E775652BA369C92817a5Fd58cF8C177a0", "0xD091a301fD757b518ce17fB2121CE74e34dfeDe1"
   );
 
   await staking.deployed();
 
   console.log("Staking deployed to:", staking.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
