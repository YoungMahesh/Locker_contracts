const { ethers } = require('hardhat')
export const deployLocker = async() => {
  const Locker = await ethers.getContractFactory('LockerV5')
  const locker = await Locker.deploy()
  await locker.deployed()
  return locker
}