'use strict';
import * as CryptoJS from 'crypto-js'
//var CryptoJS = require("crypto-js");

export type BlockData = string;

export interface Message {
    sender: User;
    receiver: User;
    message: MessageData;
};
export interface MessageData {
    type: number;
    data: Block[];
};

export class Block {
    constructor(
        public index: number, 
        public previousHash: string, 
        public timestamp: number, 
        public data: BlockData, 
        public hash: string,
        public nonce: number,
    ) {}
}

export const MessageType = {
    QUERY_LATEST: 0,
    QUERY_ALL: 1,
    RESPONSE_BLOCKCHAIN: 2
}
export function messageTypeToString(messageType: number): string {
    switch (messageType) {
        case MessageType.QUERY_LATEST:
            return 'QUERY_LATEST';
        case MessageType.QUERY_ALL:
            return 'QUERY_ALL';
        case MessageType.RESPONSE_BLOCKCHAIN:
            return 'RESPONSE_BLOCKCHAIN';
    }
    return '?';
}


function getGenesisBlock(): Block {
    const index = 0;
    const nonce = 0;
    const previousHash = '0';
    //const data = "my genesis block!!";
    const data = "initial block";
    const timestamp = 1465154705;
    return new Block(
        index, 
        previousHash, 
        timestamp, 
        data, 
        //"816534932c2b7154836da6afc367695e6337db8a921823784c14378abed4f7d7",
        calculateHash(nonce, previousHash, data),
        nonce,
    );
}

function generateNextBlock(previousBlock: Block, blockData: BlockData, nonce: number): Block {
    //var previousBlock = getLatestBlock();
    const nextIndex = previousBlock.index + 1;
    const nextTimestamp = new Date().getTime() / 1000;
    const nextHash = calculateHash(nonce, previousBlock.hash, blockData);
    return new Block(nextIndex, previousBlock.hash, nextTimestamp, blockData, nextHash, nonce);
}

function calculateHashForBlock(block: Block): string {
    return calculateHash(block.nonce, block.previousHash, block.data);
}

function calculateHash(nonce: number, previousHash: string, data: BlockData): string {
    return CryptoJS.SHA256(nonce + previousHash + data).toString();
}
//function calculateHash_orig(index: number, previousHash: string, timestamp: number, data: BlockData): string {
    //return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
//}

function isValidChain(blockchainToValidate: Block[]): boolean {
    if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(getGenesisBlock())) {
        return false;
    }
    const tempBlocks = [blockchainToValidate[0]];
    for (let i = 1; i < blockchainToValidate.length; i++) {
        if (isValidNewBlock(blockchainToValidate[i], tempBlocks[i - 1])) {
            tempBlocks.push(blockchainToValidate[i]);
        } else {
            return false;
        }
    }
    return true;
}
function isValidNewBlock(newBlock: Block, previousBlock: Block): [boolean, string] {
    if (previousBlock.index + 1 !== newBlock.index) {
        return [false, 'invalid index'];
    } else if (previousBlock.hash !== newBlock.previousHash) {
        return [false, 'invalid previoushash'];
    } else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
        console.log(typeof (newBlock.hash) + ' ' + typeof calculateHashForBlock(newBlock));
        return [false, 'invalid hash: ' + calculateHashForBlock(newBlock) + ' ' + newBlock.hash];
    }
    return [true, ''];
}

function queryChainLengthMsg(): MessageData {
    return {
        'type': MessageType.QUERY_LATEST,
        'data': [],
    };
}
function queryAllMsg(): MessageData {
    return {
        'type': MessageType.QUERY_ALL,
        'data': [],
    };
}
function responseChainMsg(user: User): MessageData {
    return {
        'type': MessageType.RESPONSE_BLOCKCHAIN,
        'data': user.blockchain,
    };
}
function responseLatestMsg(user: User): MessageData {
    return {
        'type': MessageType.RESPONSE_BLOCKCHAIN,
        'data': [user.getLatestBlock()],
    };
}

export class User {
    constructor(
        public name: string,
        public blockchain: Block[] = [getGenesisBlock()],
        public logs: string[] = [],
    ) {}
    
    initConnection(newUser: User): void {
        Users.send(this, newUser, queryChainLengthMsg());
    }

    getLatestBlock(): Block {
        return this.blockchain[this.blockchain.length - 1];
    }

    // initMessageHandler
    on_message(sender: User, message: MessageData): void {
        this.logs.push(`receive message: ${messageTypeToString(message.type)} from ${sender.name}`);
        switch (message.type) {
            case MessageType.QUERY_LATEST:
                Users.send(this, sender, responseLatestMsg(sender));
                break;
            case MessageType.QUERY_ALL:
                Users.send(this, sender, responseChainMsg(sender));
                break;
            case MessageType.RESPONSE_BLOCKCHAIN:
                this.handleBlockchainResponse(message);
                break;
        }
    }
    
    broadcast(message: MessageData): void {
        Users.users
            .filter(receiver => receiver.name != this.name)
            .forEach(receiver => Users.send(this, receiver, message));
    }
    
    addBlock(newBlock: Block): [boolean, string] {
        const result = isValidNewBlock(newBlock, this.getLatestBlock())
        if (result[0]) {
            this.blockchain.push(newBlock);
        }
        return result;
    }
    
    handleBlockchainResponse(message: MessageData): void {
        var receivedBlocks = message.data.sort((b1, b2) => (b1.index - b2.index));
        var latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
        var latestBlockHeld = this.getLatestBlock();
        if (latestBlockReceived.index > latestBlockHeld.index) {
            console.log('blockchain possibly behind. We got: ' + latestBlockHeld.index + ' Peer got: ' + latestBlockReceived.index);
            if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
                console.log("We can append the received block to our chain");
                this.blockchain.push(latestBlockReceived);
                this.broadcast(responseLatestMsg(this));
            } else if (receivedBlocks.length === 1) {
                console.log("We have to query the chain from our peer");
                this.broadcast(queryAllMsg());
            } else {
                console.log("Received blockchain is longer than current blockchain");
                this.replaceChain(receivedBlocks);
            }
        } else {
            console.log('Received blockchain is not longer than current blockchain. Do nothing');
        }
    }
    
    // コンフリクト解消：最長チェーン選択
    replaceChain(newBlocks: Block[]): string {
        if (isValidChain(newBlocks) && newBlocks.length > this.blockchain.length) {
            this.blockchain = newBlocks;
            this.broadcast(responseLatestMsg(this));
            return 'Received blockchain is valid. Replacing current blockchain with received blockchain';
        } else {
            return 'Received blockchain invalid';
        }
    }
}

export namespace Users {
    export const users: User[] = [];
    export let messages: Message[] = [];

    // connectToPeers
    export function connect(newUser: User): void {
        users.forEach(user => user.initConnection(newUser));
        users.push(newUser);
    }

    export function send(sender: User, receiver: User, message: MessageData): void {
        //ws.send(JSON.stringify(message));
        //receiver.on_message(sender, message);
        sender.logs.push(`send message: ${messageTypeToString(message.type)} to ${receiver.name}`);
        messages.push({sender, receiver, message});
    }

    export function publish(): void {
        const tmp_messages = messages;
        messages = [];
        tmp_messages.forEach(d => d.receiver.on_message(d.sender, d.message));
    }

    export function publish_to(user: User): void {
        const tmp_messages = messages.filter(m => m.receiver.name == user.name);
        messages = messages.filter(m => m.receiver.name != user.name);
        tmp_messages.forEach(d => d.receiver.on_message(d.sender, d.message));
    }
}

export namespace Server {

    // app.get('/peers', (req, res) =>
    export function peers(): User[] {
        //return sockets.map(s => s._socket.remoteAddress + ':' + s._socket.remotePort);
        return Users.users;
    }

    // app.post('/addPeer', (req, res) =>
    export function addPeer(name: string): void {
        const user = new User(name);
        Users.connect(user);
    }

    //app.get('/blocks', (req, res) =>
    export function blocks(user: User): Block[] {
        return user.blockchain;
    }

    export function mineBlock(user: User, data: BlockData, nonce: number): Block {
        return generateNextBlock(user.getLatestBlock(), data, nonce);
    }

    // app.post('/mineBlock', (req, res) =>
    export function addBlock(user: User, newBlock: Block): string {
        const result = user.addBlock(newBlock);
        if (result[0] == false) {
            return 'Bloadcast failure: ' + result[1];
        }
        user.broadcast(responseLatestMsg(user));
        //return 'block added: ' + JSON.stringify(newBlock);
        return 'Bloadcast success';
    }
}
