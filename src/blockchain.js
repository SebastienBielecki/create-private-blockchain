/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message` 
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *  
 */

const SHA256 = require('crypto-js/sha256');
var CryptoJS = require("crypto-js");
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');
const { Block } = require('bitcoinjs-lib');

class Blockchain {

    /**
     * Constructor of the class, you will need to setup your chain array and the height
     * of your chain (the length of your chain array).
     * Also everytime you create a Blockchain class you will need to initialized the chain creating
     * the Genesis Block.
     * The methods in this class will always return a Promise to allow client applications or
     * other backends to call asynchronous functions.
     */
    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    /**
     * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
     * You should use the `addBlock(block)` to create the Genesis Block
     * Passing as a data `{data: 'Genesis Block'}`
     */
    async initializeChain() {
        if( this.height === -1){
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    /**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
    getChainHeight() {
        return new Promise((resolve, reject) => {
            resolve(this.height);
        });
    }

    /**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     * The method will return a Promise that will resolve with the block added
     * or reject if an error happen during the execution.
     * You will need to check for the height to assign the `previousBlockHash`,
     * assign the `timestamp` and the correct `height`...At the end you need to 
     * create the `block hash` and push the block into the chain array. Don't for get 
     * to update the `this.height`
     * Note: the symbol `_` in the method name indicates in the javascript convention 
     * that this method is a private method. 
     */
    _addBlock(block) {
        let self = this;
        // validate chain before adding the new block
        return new Promise(async (resolve, reject) => {
           try {
                let chainErrors = await self.validateChain()
                console.log("chain errors:", chainErrors);
                if (chainErrors.lenght > 0) {
                    reject("chain has errors")
                }  
           } catch (error) {
                console.log(error);
           } 
           
           let currentHeight = await self.getChainHeight()
           let newHeight = currentHeight + 1
           block.height = newHeight
           if (currentHeight === -1) {
                // If new block is the genesys block, previous Hash shall be null
                block.previousBlockHash = null
           } else {
                // If new block is not the genesys, previous hash shall be the hash of the previous block
                let previousBlock = await self.getBlockByHeight(currentHeight)
                block.previousBlockHash = previousBlock.hash
           }
           // assign the time and calculate hash of the new Block
           block.time = new Date().getTime().toString().slice(0,-3)
           block.hash = SHA256(JSON.stringify(block)).toString(CryptoJS.enc.Hex)
           // Update the blockchain
           self.height = newHeight
           self.chain.push(block)
           // validate chain after adding the new block
           try {
                let chainErrors = await self.validateChain()
                console.log("chain errors:", chainErrors);
                if (chainErrors.lenght > 0) {
                    reject("chain has errors")
                }  
            } catch (error) {
                    console.log(error);
            } 
           resolve(block)
        });
    }

    /**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * This is the first step before submit your Block.
     * The method return a Promise that will resolve with the message to be signed
     * @param {*} address 
     */
    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            let message = `${address}:${new Date().getTime().toString().slice(0,-3)}:starRegistry`
            resolve(message)
        });
    }

    /**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain. This method will resolve with the Block added or
     * reject with an error.
     * Algorithm steps:
     * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
     * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
     * 3. Check if the time elapsed is less than 5 minutes
     * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
     * 5. Create the block and add it to the chain
     * 6. Resolve with the block added.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
    submitStar(address, message, signature, star) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            let messageTime = parseInt(message.split(':')[1])
            let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));
            if (currentTime <= messageTime + 300) {
                const isValidMessage = bitcoinMessage.verify(message, address, signature)
                if (isValidMessage) {
                    let newBlock = new BlockClass.Block({star: star, owner: address})
                    let resBlock = await self._addBlock(newBlock)
                    resolve(resBlock)
                } else {
                    console.log("invalid message");
                    reject(new Error("message is not valid"))
                }
            } else {
                console.log("more than 5 minutes");
                reject(new Error("5 minutes time limit exceeded"))
            }

        });
    }

    /**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve, reject) => {
           let block = self.chain.filter(item => item.hash = hash)[0]
           if (block) {
            resolve(block)
           } else {
            resolve(null)
           }
        });
    }

    /**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve, reject) => {
            let block = self.chain.find(p => p.height === height);
            if(block){
                resolve(block);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     * Remember the star should be returned decoded.
     * @param {*} address 
     */
    getStarsByWalletAddress (address) {
        let self = this;
        let stars = [];
        return new Promise(async (resolve, reject) => {
            for (let i = 1; i<=self.height;i++) {
                console.log("i", i)
                let data = await self.chain[i].getBData()
                console.log(data);
                if (data.owner === address) {
                    console.log("owner found");
                    stars.push(data.star)
                }
                console.log("owner not found")
            }
            resolve(stars)
        })
    }

    /**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     * Steps to validate:
     * 1. You should validate each block using `validateBlock`
     * 2. Each Block should check the with the previousBlockHash
     */
    validateChain() {
        let self = this;
        let errorLog = [];
        return new Promise(async (resolve, reject) => {
            if (self.height === -1) {
                resolve([])
            } else {
                // chechking from latest block to Genesys
                for (let i = self.height; i>=0; i--) {
                    let lastBlock = await self.chain[i]
                    // check the hash of the block is correct
                    let validBlock = await lastBlock.validate()
                    if (!validBlock) {
                        // hash is not correct
                        errorLog.push(`Error on block ${i} the block has been tempered`)
                    }
                    if (i === 0) {
                        // if we are checking the Genesys block, previousHash shall be null
                        if (lastBlock.previousBlockHash !== null) {
                            errorLog.push("previous hash on Genesys Block is not null")
                        }
                    } else {
                        // we are not checking Geneys block. previous hash of the block shall be the hash of previous block
                        let previousBlock= self.chain[i-1]
                        if (lastBlock.previousBlockHash !== previousBlock.hash) {
                            errorLog.push(`The link between block ${i} and block ${i-1} is broken`)
                        }
                    }
                }
            }
            resolve(errorLog)
        });
    }
}

// let myBlockchain = new Blockchain
// setTimeout(() => {
//     console.log(myBlockchain); 
// }, 2000);



module.exports.Blockchain = Blockchain;   