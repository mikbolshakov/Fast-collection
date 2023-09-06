import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { FastCollection } from "../typechain-types";

describe("FastCollection tests", () => {
  let nftContract: FastCollection;
  let mintPrice = ethers.utils.parseEther("0.01");
  let signers: SignerWithAddress[];
  let creator: SignerWithAddress;
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  before(async () => {
    signers = await ethers.getSigners();
    creator = signers[0];
    admin = signers[1];
    user1 = signers[2];
    user2 = signers[3];
    user3 = signers[4];
  });

  it("Deploys NFT contract", async () => {
    const Factory = await ethers.getContractFactory("FastCollection");
    const fastCollection = await Factory.deploy(
      "https://gateway.pinata.cloud/ipfs/",
      creator.address,
      creator.address,
      750
    );

    expect(fastCollection.address).to.not.eq(ethers.constants.AddressZero);
    nftContract = fastCollection as FastCollection;
  });

  it("Checks all getter functions", async () => {
    expect(await nftContract.totalCollectionAmount()).to.eq(10000);
    expect(await nftContract.mintPrice()).to.eq(mintPrice);
    expect(await nftContract.adminRole()).to.eq(
      "0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775"
    );
    expect(await nftContract.totalMinted()).to.eq(0);
    expect(await nftContract.checkCollectionURI()).to.eq(
      "https://gateway.pinata.cloud/ipfs/"
    );
    expect(await nftContract.checkWhiteList(user1.address)).to.eq(false);
  });

  it("Grants ADMIN_ROLE", async () => {
    await nftContract.grantRole(await nftContract.adminRole(), admin.address);

    expect(
      await nftContract.hasRole(await nftContract.adminRole(), admin.address)
    ).to.eq(true);
  });

  it("Checks mint function", async () => {
    let mintTx = await nftContract.connect(user1).mint(2, {
      value: mintPrice.mul(2),
    });
    await mintTx.wait();

    expect(await nftContract.balanceOf(user1.address)).to.be.eq(2);
    expect(await nftContract.ownerOf(0)).to.be.eq(user1.address);
    expect(await nftContract.ownerOf(1)).to.be.eq(user1.address);
    expect(await nftContract.totalMinted()).to.eq(2);
    await expect(nftContract.connect(user1).mint(2)).to.be.revertedWith(
      "Not enough Ether for mint"
    );
    await expect(
      nftContract.connect(user1).mint(9999, {
        value: mintPrice.mul(9999),
      })
    ).to.be.revertedWith("Max limit");
  });

  it("Adds user to WL", async () => {
    expect(await nftContract.checkWhiteList(user2.address)).to.eq(false);

    await nftContract.connect(admin).addUserToWhiteList(user2.address);

    expect(await nftContract.checkWhiteList(user2.address)).to.eq(true);
    await expect(
      nftContract.connect(admin).addUserToWhiteList(user2.address)
    ).to.be.revertedWith("Already in WL");
    await expect(
      nftContract.connect(user3).addUserToWhiteList(user1.address)
    ).to.be.revertedWith(
      "AccessControl: account 0x15d34aaf54267db7d7c367839aaf71a00a2c6a65 is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775"
    );
  });

  it("Checks freeMintForUser function", async () => {
    let mintTx = await nftContract.connect(user2).freeMintForUser(3);
    await mintTx.wait();

    expect(await nftContract.balanceOf(user2.address)).to.be.eq(3);
    expect(await nftContract.ownerOf(2)).to.be.eq(user2.address);
    expect(await nftContract.ownerOf(3)).to.be.eq(user2.address);
    expect(await nftContract.ownerOf(4)).to.be.eq(user2.address);
    expect(await nftContract.totalMinted()).to.eq(5);
    await expect(
      nftContract.connect(user1).freeMintForUser(2)
    ).to.be.revertedWith("You are not in WL");
    await expect(
      nftContract.connect(user1).freeMintForUser(9999)
    ).to.be.revertedWith("Max limit");
  });

  it("Checks freeMintForAdmin function", async () => {
    let mintTx = await nftContract.connect(admin).freeMintForAdmin(1);
    await mintTx.wait();

    expect(await nftContract.balanceOf(admin.address)).to.be.eq(1);
    expect(await nftContract.ownerOf(5)).to.be.eq(admin.address);
    expect(await nftContract.totalMinted()).to.eq(6);
    await expect(
      nftContract.connect(user1).mint(9999, {
        value: mintPrice.mul(9999),
      })
    ).to.be.revertedWith("Max limit");
    await expect(
      nftContract.connect(user1).freeMintForAdmin(1)
    ).to.be.revertedWith(
      "AccessControl: account 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775"
    );
    await expect(
      nftContract.connect(admin).freeMintForAdmin(9999)
    ).to.be.revertedWith("Max limit");
  });

  it("Checks saleOn and saleOff functions", async () => {
    await nftContract.connect(admin).saleOff();

    await expect(
      nftContract.connect(user1).mint(1, { value: mintPrice.mul(1) })
    ).to.be.revertedWith("Pausable: paused");
    await expect(
      nftContract.connect(user2).freeMintForUser(1)
    ).to.be.revertedWith("Pausable: paused");
    await expect(
      nftContract.connect(admin).freeMintForAdmin(1)
    ).to.be.revertedWith("Pausable: paused");

    await nftContract.connect(admin).saleOn();

    await expect(nftContract.connect(user1).saleOff()).to.be.revertedWith(
      "AccessControl: account 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775"
    );
    await expect(nftContract.connect(user1).saleOn()).to.be.revertedWith(
      "AccessControl: account 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775"
    );
  });

  it("Checks widthdraw function", async () => {
    const nftContractBalance = await ethers.provider.getBalance(
      nftContract.address
    );
    const balanceCreatorBeforeWithdraw = await ethers.provider.getBalance(
      creator.address
    );

    await nftContract.connect(admin).widthdraw(creator.address);

    const balanceCreatorAfterWithdraw = await ethers.provider.getBalance(
      creator.address
    );

    expect(
      balanceCreatorAfterWithdraw.sub(balanceCreatorBeforeWithdraw)
    ).to.be.eq(nftContractBalance);
    await expect(
      nftContract.connect(user1).widthdraw(creator.address)
    ).to.be.revertedWith(
      "AccessControl: account 0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775"
    );
  });

  it("Checks NFT transfer functions", async () => {
    expect(await nftContract.balanceOf(admin.address)).to.be.eq(1);
    expect(await nftContract.balanceOf(user3.address)).to.be.eq(0);
    expect(await nftContract.ownerOf(5)).to.be.eq(admin.address);

    await nftContract
      .connect(admin)
      .transferFrom(admin.address, user3.address, 5);

    expect(await nftContract.balanceOf(admin.address)).to.be.eq(0);
    expect(await nftContract.balanceOf(user3.address)).to.be.eq(1);
    expect(await nftContract.ownerOf(5)).to.be.eq(user3.address);
    await expect(
      nftContract.connect(user1).transferFrom(user1.address, user3.address, 1)
    ).to.be.revertedWith("Only admin can transfer NFTs");
  });
});
