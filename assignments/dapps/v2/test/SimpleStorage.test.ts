import { expect } from "chai";
import { ethers } from "hardhat";
import { SimpleStorage } from "../typechain-types/SimpleStorage";

describe("SimpleStorage", function () {
  let simpleStorage: SimpleStorage;
  let owner: any;
  let nonOwner: any;

  beforeEach(async function () {
    // Get signers
    const [ownerSigner, nonOwnerSigner] = await ethers.getSigners();
    owner = ownerSigner;
    nonOwner = nonOwnerSigner;

    // Deploy contract
    const SimpleStorageFactory = await ethers.getContractFactory("SimpleStorage");
    simpleStorage = await SimpleStorageFactory.deploy();
    await simpleStorage.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct owner", async function () {
      const contractOwner = await simpleStorage.owner();
      expect(contractOwner).to.equal(owner.address);
    });

    it("Should initialize stored value to 0", async function () {
      const value = await simpleStorage.getValue();
      expect(value).to.equal(0);
    });

    it("Should emit OwnershipTransferred event on deployment", async function () {
      // The contract should emit OwnershipTransferred from address(0) to owner
      await expect(simpleStorage.deploymentTransaction())
        .to.emit(simpleStorage, "OwnershipTransferred")
        .withArgs(ethers.ZeroAddress, owner.address);
    });
  });

  describe("Storage Operations", function () {
    describe("setValue", function () {
      it("Should store a value correctly", async function () {
        const testValue = ethers.parseEther("1.5");
        await expect(simpleStorage.setValue(testValue))
          .to.emit(simpleStorage, "ValueChanged")
          .withArgs(0n, testValue, owner.address);
        
        const storedValue = await simpleStorage.getValue();
        expect(storedValue).to.equal(testValue);
      });

      it("Should update value correctly when called multiple times", async function () {
        const firstValue = ethers.parseEther("1.0");
        const secondValue = ethers.parseEther("2.5");
        
        // Set first value
        await simpleStorage.setValue(firstValue);
        let storedValue = await simpleStorage.getValue();
        expect(storedValue).to.equal(firstValue);

        // Set second value
        await expect(simpleStorage.setValue(secondValue))
          .to.emit(simpleStorage, "ValueChanged")
          .withArgs(firstValue, secondValue, owner.address);
        
        storedValue = await simpleStorage.getValue();
        expect(storedValue).to.equal(secondValue);
      });

      it("Should emit ValueChanged event with correct parameters", async function () {
        const oldValue = 0n;
        const newValue = ethers.parseEther("1.0");
        
        const tx = await simpleStorage.setValue(newValue);
        const receipt = await tx.wait();
        
        const event = receipt!.logs.find(
          (log: any) => log.fragment?.name === "ValueChanged"
        );
        
        expect(event).to.not.be.undefined;
        expect(event.args.oldValue).to.equal(oldValue);
        expect(event.args.newValue).to.equal(newValue);
        expect(event.args.changedBy).to.equal(owner.address);
      });

      it("Should handle zero value storage", async function () {
        const testValue = 0n;
        await expect(simpleStorage.setValue(testValue))
          .to.emit(simpleStorage, "ValueChanged")
          .withArgs(0n, testValue, owner.address);
        
        const storedValue = await simpleStorage.getValue();
        expect(storedValue).to.equal(testValue);
      });

      it("Should handle maximum uint256 value", async function () {
        const maxValue = ethers.MaxUint256;
        await expect(simpleStorage.setValue(maxValue))
          .to.emit(simpleStorage, "ValueChanged")
          .withArgs(0n, maxValue, owner.address);
        
        const storedValue = await simpleStorage.getValue();
        expect(storedValue).to.equal(maxValue);
      });

      it("Should handle large values correctly", async function () {
        const largeValue = ethers.toBigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935");
        await expect(simpleStorage.setValue(largeValue))
          .to.emit(simpleStorage, "ValueChanged")
          .withArgs(0n, largeValue, owner.address);
        
        const storedValue = await simpleStorage.getValue();
        expect(storedValue).to.equal(largeValue);
      });
    });

    describe("getValue", function () {
      it("Should return correct value", async function () {
        const testValue = ethers.parseEther("3.14");
        await simpleStorage.setValue(testValue);
        
        const retrievedValue = await simpleStorage.getValue();
        expect(retrievedValue).to.equal(testValue);
      });

      it("Should work when called multiple times", async function () {
        const testValue = ethers.parseEther("4.2");
        await simpleStorage.setValue(testValue);
        
        // Call getValue multiple times
        const firstCall = await simpleStorage.getValue();
        const secondCall = await simpleStorage.getValue();
        const thirdCall = await simpleStorage.getValue();
        
        expect(firstCall).to.equal(testValue);
        expect(secondCall).to.equal(testValue);
        expect(thirdCall).to.equal(testValue);
      });

      it("Should return 0 when no value has been stored", async function () {
        const value = await simpleStorage.getValue();
        expect(value).to.equal(0);
      });
    });
  });

  describe("Access Control", function () {
    describe("onlyOwner modifier", function () {
      it("Should allow owner to set value", async function () {
        const testValue = ethers.parseEther("1.0");
        await expect(simpleStorage.connect(owner).setValue(testValue))
          .to.emit(simpleStorage, "ValueChanged");
      });

      it("Should revert when non-owner tries to set value", async function () {
        const testValue = ethers.parseEther("1.0");
        await expect(
          simpleStorage.connect(nonOwner).setValue(testValue)
        ).to.be.revertedWithCustomError(simpleStorage, "NotOwner");
      });

      it("Should revert when zero address tries to set value", async function () {
        const testValue = ethers.parseEther("1.0");
        await expect(
          simpleStorage.connect(ethers.ZeroAddress).setValue(testValue)
        ).to.be.revertedWithCustomError(simpleStorage, "NotOwner");
      });
    });
  });

  describe("Ownership", function () {
    describe("transferOwnership", function () {
      it("Should transfer ownership to new address", async function () {
        await expect(simpleStorage.transferOwnership(nonOwner.address))
          .to.emit(simpleStorage, "OwnershipTransferred")
          .withArgs(owner.address, nonOwner.address);

        const newOwner = await simpleStorage.owner();
        expect(newOwner).to.equal(nonOwner.address);
      });

      it("Should revert when transferring to zero address", async function () {
        await expect(
          simpleStorage.transferOwnership(ethers.ZeroAddress)
        ).to.be.revertedWith("SimpleStorage: new owner is zero address");
      });

      it("Should allow new owner to set values after transfer", async function () {
        // Transfer ownership
        await simpleStorage.transferOwnership(nonOwner.address);
        
        // New owner should be able to set value
        const testValue = ethers.parseEther("2.0");
        await expect(simpleStorage.connect(nonOwner).setValue(testValue))
          .to.emit(simpleStorage, "ValueChanged")
          .withArgs(0n, testValue, nonOwner.address);
      });

      it("Should prevent old owner from setting values after transfer", async function () {
        // Transfer ownership
        await simpleStorage.transferOwnership(nonOwner.address);
        
        // Old owner should not be able to set value
        const testValue = ethers.parseEther("2.0");
        await expect(
          simpleStorage.connect(owner).setValue(testValue)
        ).to.be.revertedWithCustomError(simpleStorage, "NotOwner");
      });
    });

    describe("renounceOwnership", function () {
      it("Should allow owner to renounce ownership", async function () {
        await expect(simpleStorage.renounceOwnership())
          .to.emit(simpleStorage, "OwnershipTransferred")
          .withArgs(owner.address, ethers.ZeroAddress);

        const newOwner = await simpleStorage.owner();
        expect(newOwner).to.equal(ethers.ZeroAddress);
      });

      it("Should prevent anyone from setting values after renouncing", async function () {
        await simpleStorage.renounceOwnership();
        
        const testValue = ethers.parseEther("1.0");
        await expect(
          simpleStorage.connect(owner).setValue(testValue)
        ).to.be.revertedWithCustomError(simpleStorage, "NotOwner");
        
        await expect(
          simpleStorage.connect(nonOwner).setValue(testValue)
        ).to.be.revertedWithCustomError(simpleStorage, "NotOwner");
      });

      it("Should prevent owner from transferring ownership after renouncing", async function () {
        await simpleStorage.renounceOwnership();
        
        await expect(
          simpleStorage.transferOwnership(nonOwner.address)
        ).to.be.revertedWithCustomError(simpleStorage, "NotOwner");
      });
    });
  });

  describe("Edge Cases", function () {
    it("Should handle maximum gas value storage", async function () {
      const maxGasValue = ethers.toBigInt("9007199254740991"); // Max safe integer
      await expect(simpleStorage.setValue(maxGasValue))
        .to.emit(simpleStorage, "ValueChanged")
        .withArgs(0n, maxGasValue, owner.address);
      
      const storedValue = await simpleStorage.getValue();
      expect(storedValue).to.equal(maxGasValue);
    });

    it("Should handle consecutive value changes", async function () {
      const values = [1n, 2n, 3n, ethers.MaxUint256, 0n];
      
      for (let i = 0; i < values.length; i++) {
        const currentValue = values[i];
        const previousValue = i > 0 ? values[i - 1] : 0n;
        
        await expect(simpleStorage.setValue(currentValue))
          .to.emit(simpleStorage, "ValueChanged")
          .withArgs(previousValue, currentValue, owner.address);
        
        const storedValue = await simpleStorage.getValue();
        expect(storedValue).to.equal(currentValue);
      }
    });

    it("Should handle multiple owners in sequence", async function () {
        // Transfer ownership to nonOwner
        await simpleStorage.transferOwnership(nonOwner.address);
        
        // NonOwner sets a value
        const firstValue = ethers.parseEther("1.0");
        await simpleStorage.connect(nonOwner).setValue(firstValue);
        
        // Transfer back to original owner
        await simpleStorage.connect(nonOwner).transferOwnership(owner.address);
        
        // Original owner sets another value
        const secondValue = ethers.parseEther("2.0");
        await simpleStorage.connect(owner).setValue(secondValue);
        
        // Verify final value
        const finalValue = await simpleStorage.getValue();
        expect(finalValue).to.equal(secondValue);
    });
  });

  describe("Event Consistency", function () {
    it("Should always emit ValueChanged event on setValue", async function () {
      const testValues = [1n, 2n, 3n, 100n, ethers.MaxUint256];
      
      for (const value of testValues) {
        const tx = await simpleStorage.setValue(value);
        const receipt = await tx.wait();
        
        const event = receipt!.logs.find(
          (log: any) => log.fragment?.name === "ValueChanged"
        );
        
        expect(event).to.not.be.undefined;
        expect(event.args.oldValue).to.equal(value - 1n);
        expect(event.args.newValue).to.equal(value);
        expect(event.args.changedBy).to.equal(owner.address);
      }
    });
  });
});