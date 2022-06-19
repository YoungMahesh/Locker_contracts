import { deployLocker } from "./deploy"

const { expect } = require('chai')
const { ethers, waffle } = require('hardhat')
const BN = ethers.BigNumber.from

describe('Locker Contract', function () {
  const provider = waffle.provider
  let locker: any, tron: any, devyani: any, penguins: any
  let user0: any, signer0: any, signer1: any
  const currTime = Math.floor(Date.now() / 1000)
  const oneHourLater = currTime + 3600
  const _29Days = currTime + 86400 * 29
  

  it('Start Locker', async function () {
    const [owner, addr1] = await ethers.getSigners()
    user0 = await owner.getAddress()
    signer0 = owner
    signer1 = addr1
		locker = await deployLocker()
  })

  // ERC20 Lock and Unlock
  it('ERC20: Deploy Tron Contract', async function () {
    const TronFactory = await ethers.getContractFactory('Tron')
    tron = await TronFactory.deploy()
    await tron.deployed()

    expect(await tron.name()).to.equal('Tron')
    expect(await tron.symbol()).to.equal('TRX')
    expect(await tron.decimals()).to.equal(18)
  })

	let locksArr: string[] = []
  it('ERC20: Lock Tokens', async function () {
    const amount1 = BN('10').mul(BN('10').pow('18'))
		
    await tron.approve(locker.address, amount1.mul(2))

    // lock with unlock-time in past and unlock-time in future
    await locker.createLocker(2, tron.address, 0, amount1, currTime)
    await locker.createLocker(2, tron.address, 0, amount1, _29Days)

    // const _31Days = currTime + 86400 * 31
    // await expect(
    //   locker.createLocker(2, tron.address, 0, amount1, _31Days)
    // ).to.be.revertedWith('Currently can lock only for 30 days')

    expect(await tron.balanceOf(locker.address)).to.equal(amount1.mul(2))

    locksArr = await locker.lockersOfUser(user0, 0,2)

    expect(await locker.noOfLocksOf(user0)).to.equal(2)
  })

  it('ERC20: Non owner could not unlock', async function () {
    await expect(
      locker.connect(signer1).destroyLocker(locksArr[0])
    ).to.be.revertedWith('You are not token owner')
  })

  it('ERC20: Owner can unlock', async function () {
    locksArr = await locker.lockersOfUser(user0, 0, 2)
    await locker.destroyLocker(locksArr[0])
  })
  it('ERC20: Cannot withdraw from destroyed lock', async function () {
    await expect(locker.destroyLocker(locksArr[0])).to.be.revertedWith('Tokens are already withdrawn')
  })
  it('ERC20: Cannot unlock if unlocktime in future', async function () {
    await expect(locker.destroyLocker(locksArr[1])).to.be.revertedWith('Unlock time is in future')
  })
  it('ERC20: user locksArray size reduced after withdrawl', async function () {
    expect(await locker.noOfLocksOf(user0)).to.equal(1)
  })

  // ERC721 Lock and Unlock
  it('ERC721: Deploy Devyani Contract', async function () {
    const Devyani = await ethers.getContractFactory('Devyani')
    devyani = await Devyani.deploy()
    await devyani.deployed()

    expect(await devyani.name()).to.equal('Devyani')
    expect(await devyani.symbol()).to.equal('DV')
  })
  it('ERC721: Mint Tokens', async function () {
    await devyani.safeMint(user0, 1)
    await devyani.safeMint(user0, 2)
    expect(await devyani.ownerOf(1)).to.equal(user0)
    expect(await devyani.ownerOf(2)).to.equal(user0)
  })
  it('ERC721: Lock Tokens', async function () {
    expect(await devyani.ownerOf(1)).to.not.equal(locker.address)
    expect(await devyani.ownerOf(2)).to.not.equal(locker.address)

    await devyani.setApprovalForAll(locker.address, true)

    // lock with unlock-time in past and unlock-time in future
    await locker.createLocker(3, devyani.address, 1, 1, currTime)
    await locker.createLocker(3, devyani.address, 2, 1, oneHourLater)

    locksArr = await locker.lockersOfUser(user0, 0, 3)
		expect(await locker.noOfLocksOf(user0)).to.equal(3)
    // index0 is created at the time of erc20 lock, while index1 and index2 are erc721 lock
  })
  it('ERC721: Unlock Tokens', async function () {
    expect(await devyani.ownerOf(1)).to.equal(locker.address)
    expect(await devyani.ownerOf(1)).to.not.equal(user0)

    await locker.destroyLocker(locksArr[1])
    // index0 is erc20 lock, index1 and index2 are erc721 lock

    expect(await devyani.ownerOf(1)).to.not.equal(locker.address)
    expect(await devyani.ownerOf(1)).to.equal(user0)
  })
  it('ERC721: Cannot withdraw from destroyed lock', async function () {
    await expect(locker.destroyLocker(locksArr[1])).to.be.revertedWith('Tokens are already withdrawn')
  })
  it('ERC721: lockArr size reduced after withdrawal', async function () {
    expect(await locker.noOfLocksOf(user0)).to.equal(2)
    // index 0 is erc20 lock, index1 is erc721 lock
  })

  // ERC1155 Transfers
  it('ERC1155: Deploy Penguins Contract', async function () {
    const Penguins = await ethers.getContractFactory('Penguins')
    penguins = await Penguins.deploy()
    await penguins.deployed()
  })
  it('ERC1155: Mint Tokens', async function () {
    await penguins.mintBatch(user0, [1, 2], [20, 20], '0x')
    expect(await penguins.balanceOf(user0, 1)).to.equal(20)
    expect(await penguins.balanceOf(user0, 2)).to.equal(20)
  })
  it('ERC1155: Lock Tokens', async function () {
    expect(await penguins.balanceOf(locker.address, 1)).to.not.equal(4)
    expect(await penguins.balanceOf(locker.address, 2)).to.not.equal(4)

    await penguins.setApprovalForAll(locker.address, true)
    expect(await penguins.isApprovedForAll(user0, locker.address)).to.equal(
      true
    )

    // lock with unlock-time in past and unlock-time in future
    await locker.createLocker(4, penguins.address, 1, 4, currTime)
    await locker.createLocker(4, penguins.address, 2, 4, oneHourLater)

    locksArr = await locker.lockersOfUser(user0,0,4)
    // index0 is erc20, index1 is erc721
    // id3, id4 are created at the time of erc721 lock
    expect(await locker.noOfLocksOf(user0)).to.equal(4)
  })
  it('ERC1155: Unlock Tokens', async function () {
    expect(await penguins.balanceOf(locker.address, 1)).to.equal(4)
    expect(await penguins.balanceOf(user0, 1)).to.not.equal(20)

    await locker.destroyLocker(locksArr[2])

    expect(await penguins.balanceOf(locker.address, 1)).to.not.equal(4)
    expect(await penguins.balanceOf(user0, 1)).to.equal(20)
  })
  it('ERC1155: Cannot withdraw from destroyed lock', async function () {
    await expect(locker.destroyLocker(locksArr[2])).to.be.revertedWith('Tokens are already withdrawn')
  })

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
  const ethInWei = '15000'
  it('ETH: Cannot lock less or more ether than tokenAmount', async function () {
    await expect(
      locker.createLocker(1, ZERO_ADDRESS, 0, ethInWei, currTime, {
        value: '10000',
      })
    ).to.be.revertedWith('06')
    await expect(
      locker.createLocker(1, ZERO_ADDRESS, 0, ethInWei, currTime, {
        value: '20000',
      })
    ).to.be.revertedWith('06')
  })
  it('ETH: Lock', async function () {
    await locker.createLocker(1, ZERO_ADDRESS, 0, ethInWei, currTime, {
      value: ethInWei,
    })
    await locker.createLocker(1, ZERO_ADDRESS, 0, ethInWei, oneHourLater, {
      value: ethInWei,
    })
    expect(await provider.getBalance(locker.address)).to.equal(30000)

		expect(await locker.noOfLocksOf(user0)).to.equal(5)
    locksArr = await locker.lockersOfUser(user0, 0, 5)
  })
  it('ETH: Unlock', async function () {
    await locker.destroyLocker(locksArr[3])

    expect(await provider.getBalance(locker.address)).to.equal(15000)
  })
  it('ETH: Cannot withdraw from destroyed lock', async function () {
    await expect(locker.destroyLocker(locksArr[3])).to.be.revertedWith('Tokens are already withdrawn')
  })
  it('4 Locks remaining', async function () {
    expect(await locker.noOfLocksOf(user0)).to.equal(4)
    locksArr = await locker.lockersOfUser(user0, 0, 4)
    expect(locksArr[0]).to.equal(2)
    expect(locksArr[1]).to.equal(4)
    expect(locksArr[2]).to.equal(6)
    expect(locksArr[3]).to.equal(8)
  })
})
