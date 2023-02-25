const { expect, assert } = require('chai');
const { BigNumber, utils, provider } = require('ethers');
const { ethers, waffle } = require('hardhat');

describe("ERC20 Token with Permit", function () {
    const name = "Token name"
    const symbol = "TKS"
    const decimals = 0
    const supply = 1000
    const amount = 500
    
    let token, vault, owner, user

    const ERC20Permit_ABI = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address) view returns (uint)",
        "function approve(address,uint256) public returns (bool)",
        "function transfer(address,uint256) public returns (bool)",
        "function transferFrom(address,address,uint256) public returns (bool)",
        "function mint(address,uint256) external",
        "function permit(address,address,uint256,uint256,uint8,bytes32,bytes32) external"
    ]

    beforeEach('setup others', async function () {
        [ owner, user ] = await ethers.getSigners()

        const Token = await ethers.getContractFactory("ERC20Permit")
        token = await Token.deploy(name, symbol, decimals, supply)
        await token.deployed()

        const Vault = await ethers.getContractFactory("Vault")
        vault = await Vault.deploy(token.address)
        await vault.deployed()
    })

    it("Should be possible to deposite token with permit", async () => {
        const deadline = ethers.constants.MaxUint256

        const { v, r, s } = await getPermitSignature(
            owner,
            token,
            vault.address,
            amount,
            deadline
        )

        await vault.depositeWithPermit(amount, deadline, v, r, s)
        expect(await token.balanceOf(vault.address)).to.eq(amount)
        expect(await token.balanceOf(owner.address)).to.eq(supply - amount)
    })

    it("Should revert permit in case deadline is expired", async () => {
        const block = await ethers.provider.getBlock()
        const deadline = block.timestamp + 20

        const { v, r, s } = await getPermitSignature(
            owner,
            token,
            vault.address,
            amount,
            deadline
        )

        await ethers.provider.send("evm_setNextBlockTimestamp", [deadline,])
        await ethers.provider.send("evm_mine")

        await expect(vault.depositeWithPermit(amount, deadline, v, r, s))
            .to.be.revertedWith("PERMIT_DEADLINE_EXPIRED")
        expect(await token.balanceOf(vault.address)).to.eq(0)
        expect(await token.balanceOf(owner.address)).to.eq(supply)
    })

    it("Should revert permit in case invalid signature", async () => {
        const deadline = ethers.constants.MaxUint256

        const { v, r, s } = await getPermitSignature(
            user,
            token,
            vault.address,
            amount,
            deadline
        )

        await expect(vault.depositeWithPermit(amount, deadline, v, r, s))
            .to.be.revertedWith("INVALID_SIGNER")
        expect(await token.balanceOf(vault.address)).to.eq(0)
        expect(await token.balanceOf(owner.address)).to.eq(supply)
    })

})

async function getPermitSignature(signer, token, spender, value, deadline) {
    const [ nonce, name, version, chainId ] = await Promise.all([
        token.nonces(signer.address),
        token.name(),
        "1",
        signer.getChainId(),
    ])
  
    return ethers.utils.splitSignature(
        await signer._signTypedData(
        {
            name,
            version,
            chainId,
            verifyingContract: token.address,
        },
        {
            Permit: [
            {
                name: "owner",
                type: "address",
            },
            {
                name: "spender",
                type: "address",
            },
            {
                name: "value",
                type: "uint256",
            },
            {
                name: "nonce",
                type: "uint256",
            },
            {
                name: "deadline",
                type: "uint256",
            },
          ],
        },
        {
            owner: signer.address,
            spender,
            value,
            nonce,
            deadline,
        }
      )
    )
}