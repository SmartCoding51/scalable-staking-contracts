// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Staking Contract
 * @author Kei Nakano - Nave Finance
 * @notice scalable reward distribution algorithm
 **/

contract Staking is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ========== STATE VARIABLES ========== */

    IERC20 public rewardToken;
    IERC20 public stakingToken;

    uint256 public constant DIVISION = 10000; // to prevent float calculation

    uint256 public lastRewardRate; // S = 0;
    uint256 public totalStakedAmount; // T = 0;
    mapping(address => uint256) public stakedBalance; // stake = {};
    mapping(address => uint256) public rewardRate; // S0 = {};

    event Stake(address indexed user, uint256 amount);
    event Unstake(address indexed user, uint256 amount);
    event ClaimReward(address indexed user, uint256 reward);
    event Distribute(address indexed user, uint256 reward);

    constructor(
        address _stakingToken,
        address _rewardToken
    ) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
    }

    function stake(uint256 _amount) external nonReentrant {
        require(_amount > 0,  "Cannot stake 0");
        stakingToken.safeTransferFrom(msg.sender, address(this), _amount);
        stakedBalance[msg.sender] += _amount; // stake[address] = amount;
        rewardRate[msg.sender] = lastRewardRate; // S0[address] = S;
        totalStakedAmount += _amount; // T = T + amount;
        emit Stake(msg.sender, _amount);
    }

    function unstake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Cannot withdraw 0");

        uint256 deposited = stakedBalance[msg.sender]; // deposited = stake[address];
        require(_amount <= deposited, "Withdraw amount is invalid");
        stakingToken.safeTransfer(msg.sender, _amount);

        uint256 reward = deposited * (lastRewardRate - rewardRate[msg.sender]) / DIVISION; // reward = deposited * (S - S0[address]);
        if (reward > 0) {
            rewardToken.safeTransfer(msg.sender, reward);
        }
        rewardRate[msg.sender] = lastRewardRate;
        totalStakedAmount -= _amount; // T = T - deposited;
        stakedBalance[msg.sender] -= _amount; // stake[address] = 0;
        emit Unstake(msg.sender, _amount);
    }

    function unstakeAll() external nonReentrant {
        uint256 deposited = stakedBalance[msg.sender]; // deposited = stake[address];
        stakingToken.safeTransfer(msg.sender, deposited);
        uint256 reward = deposited * (lastRewardRate - rewardRate[msg.sender]) / DIVISION; // reward = deposited * (S - S0[address]);
        if (reward > 0) {
            rewardToken.safeTransfer(msg.sender, reward);
        }
        totalStakedAmount -= deposited; // T = T - deposited;
        stakedBalance[msg.sender] = 0; // stake[address] = 0;
        emit Unstake(msg.sender, deposited);
    }

    function distribute(uint _reward) external onlyOwner {
        require(_reward > 0, "Cannot distribute 0");
        require(totalStakedAmount > 0, "No staked amount"); // if T==0 then revert();
        rewardToken.safeTransferFrom(msg.sender, address(this), _reward);
        /// r / t can be under 0
        lastRewardRate += (_reward * DIVISION / totalStakedAmount); // S = S + r / T;
        emit Distribute(msg.sender, _reward);
    }
    
    function claimReward() external nonReentrant {
        uint256 deposited = stakedBalance[msg.sender];
        uint256 reward = deposited * (lastRewardRate - rewardRate[msg.sender]) / DIVISION; // reward = deposited * (S - S0[address]);
        if (reward > 0) {
            rewardToken.safeTransfer(msg.sender, reward);
        }
        rewardRate[msg.sender] = lastRewardRate;
        emit ClaimReward(msg.sender, reward);
    }

    function rewardOf(address _account) public view returns (uint256){
        uint deposited = stakedBalance[_account]; // deposited = stake[address];
        return deposited * (lastRewardRate - rewardRate[_account]) / DIVISION; // reward = deposited * (S - S0[address]);
    }
}