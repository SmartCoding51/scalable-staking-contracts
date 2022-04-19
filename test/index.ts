import { expect } from "chai";
import { Signer } from "ethers";
import { ethers } from "hardhat";
import hre from "hardhat";

const { parseUnits } = ethers.utils;

import {
  Staking,
  MockERC20,
  ERC20
} from '../typechain';

describe("NaveStaking", function () {
  let staking: Staking;
  let stakingToken: MockERC20;
  let busdToken: ERC20;

  // BUSD token address on the mainnet
  const BUSD = "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56";
  // NAVE token address on the mainnet
  // const NAVE = "0x43642D8b7480b83355b83cf451dd1C4314B1260f";
  // A wallet address that has some amount of BUSD
  const whaleAddress = "0x8894E0a0c962CB723c1976a4421c95949bE2D4E3";

  let ownerSigner: Signer, user1Signer: Signer, user2Signer: Signer;
  let whaleSigner: Signer;
  let owner: string, user1: string, user2: string;

  const approvalAmount = parseUnits("1000000000", 18);
  
  before(async() => {
    [ownerSigner, user1Signer, user2Signer] = await ethers.getSigners();
    owner = await ownerSigner.getAddress();
    user1 = await user1Signer.getAddress();
    user2 = await user2Signer.getAddress();

    const feeReceiver = "0x87682fEE6dbC7A4475b5E1352c7C663306B2e028";

    const StakingToken = await ethers.getContractFactory("MockERC20");
    stakingToken = await StakingToken.deploy(
      "Test", 
      "TEST", 
      18,
      250000000,
      owner
    );
    await stakingToken.deployed();
    
    // get BUSD contract
    const ERC20 = await ethers.getContractFactory("ERC20");
    busdToken = await ERC20.attach(BUSD);

    const Staking = await ethers.getContractFactory("Staking");
    staking = await Staking.deploy(
      stakingToken.address,
      busdToken.address
    );
    await staking.deployed();
    
    /* await ownerSigner.sendTransaction({
      to: whaleAddress,
      value: parseEther("10"),
    }); */

    // unlock account
    await hre.network.provider.send("hardhat_impersonateAccount", [whaleAddress]);
    whaleSigner = await ethers.provider.getSigner(whaleAddress);

    // transfer staking tokens into the test accounts
    await stakingToken
      .connect(ownerSigner)
      .approve(user1, approvalAmount);

    await stakingToken
      .connect(ownerSigner)
      .approve(user2, approvalAmount);

    await stakingToken
      .connect(ownerSigner)
      .transfer(user1, parseUnits("1000", 18));

    await stakingToken
      .connect(ownerSigner)
      .transfer(user2, parseUnits("1000", 18));
  });

  describe("Stake", () => {
    it("User1 stakes 300 NAVE tokens", async() => {
      await stakingToken.connect(user1Signer).approve(staking.address, approvalAmount);
      
      const stakeAmount1 = parseUnits("300", 18);
      // Stake event
      await expect(
        staking.connect(user1Signer).stake(stakeAmount1)
      ).to.emit(staking, 'Stake').withArgs(user1, stakeAmount1);
      
      // Staked amount
      const user1Staked = await staking.stakedBalance(user1);
      expect(user1Staked).to.equal(stakeAmount1);

      // User1 current reward rate
      expect(await staking.rewardRate(user1)).to.equal(0);
    });

    it("User2 stakes 200 NAVE tokens", async() => {
      await stakingToken.connect(user2Signer).approve(staking.address, approvalAmount);
      
      const stakeAmount2 = parseUnits("200", 18);
      await expect(
        staking.connect(user2Signer).stake(stakeAmount2)
      ).to.emit(staking, 'Stake').withArgs(user2, stakeAmount2);
      
      const user2Staked = await staking.stakedBalance(user2);
      expect(user2Staked).to.equal(stakeAmount2);

      // User2 current reward rate
      expect(await staking.rewardRate(user2)).to.equal(0);
    });
  });

  describe("Distribute rewards", () => {
    before(async() => {
      // transfer BUSD into the owner account from a whale address
      // since only owner can call distribute function
      await busdToken.connect(whaleSigner).approve(owner, approvalAmount);

      await busdToken.connect(whaleSigner).transfer(owner, parseUnits("1000", 18));
    });

    it("distribute", async() => {
      await busdToken.connect(ownerSigner).approve(staking.address, approvalAmount);
      
      const distributeAmount = parseUnits("50", 18);
      await staking.connect(ownerSigner).distribute(distributeAmount);

      // check reward balance of Staking Contract
      const rewardBalance = await busdToken.balanceOf(staking.address);
      expect(distributeAmount).to.equal(rewardBalance);

      // check last reward rate
      const lastRewardRate = await staking.lastRewardRate();
      expect(lastRewardRate.toString()).to.equal((50 * 10000 / 500).toString());
    });
  });

  describe("Only User1 claim his reward & Second distribution", async() => {
    it("User1 claim his reward", async() => {
      // before claim
      const user1RewardBefore = await staking.rewardOf(user1);
      // ClaimReward event
      await expect(
        staking.connect(user1Signer).claimReward()
      ).to.emit(staking, 'ClaimReward').withArgs(user1, user1RewardBefore);

      const user1Reward = await staking.rewardOf(user1);
      const user2Reward = await staking.rewardOf(user2);
    });

    it("Second distribution", async() => {
      const distributeAmount = parseUnits("10", 18);
      await staking.connect(ownerSigner).distribute(distributeAmount);

      const user1Reward = await staking.rewardOf(user1);
      const user2Reward = await staking.rewardOf(user2);
    });
  });

  describe("Unstake", () => {
    it("unstake", async() => {
      const amount = parseUnits("150", 18);
      await expect(
        staking.connect(user1Signer).unstake(amount)
      ).to.emit(staking, 'Unstake').withArgs(user1, amount);

      const stakedBalance = await staking.stakedBalance(user1);
      expect(stakedBalance).to.equal(amount);

      const reward = await staking.rewardOf(user1);
      expect(reward.toString()).to.equal("0");
    });

    it("unstakeAll", async() => {
      await staking.connect(user2Signer).unstakeAll();
      const stakedBalance = await staking.stakedBalance(user2);
      expect(stakedBalance.toString()).to.equal("0");

      const reward = await staking.rewardOf(user2);
      expect(reward.toString()).to.equal("0");
    });
  });
});
