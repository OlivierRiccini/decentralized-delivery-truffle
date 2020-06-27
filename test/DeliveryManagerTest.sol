pragma solidity ^0.6.6;

import 'truffle/Assert.sol';
import 'truffle/DeployedAddresses.sol';
import '../contracts/DeliveryManager.sol';

contract DeliveryManagerTest {

    DeliveryManager deliveryManager;
    bytes32 deliveryHash;
    bytes32 SENDER_NAME = keccak256('Olivier');
    bytes32 SENDER_PHONE = keccak256('4382341122');
    bytes32 SENDER_EMAIL = keccak256('olivier@test.com');
    address RECEIVER_ETH_ADDRESS = msg.sender; // don't know how to generate mocked address
    bytes32 RECEIVER_NAME = keccak256('Jano');
    bytes32 RECEIVER_PHONE = keccak256('4382341129');
    bytes32 RECEIVER_EMAIL = keccak256('jano@test.com');
    bytes32 FROM_ADRESS = keccak256('1234 Main street');
    bytes32 TO_ADDRESS = keccak256('887 Nice street');
    uint REWARD = 50;
    uint CAUTION_AMOUNT = 1200;
    uint256 DEADLINE = now + 1 days;

    function beforeEach() public {
        deliveryManager = new DeliveryManager();
        deliveryManager.createDelivery(
            SENDER_NAME,
            SENDER_PHONE,
            SENDER_EMAIL,
            RECEIVER_ETH_ADDRESS,
            RECEIVER_NAME,
            RECEIVER_PHONE,
            RECEIVER_EMAIL,
            FROM_ADRESS,
            TO_ADDRESS,
            REWARD,
            CAUTION_AMOUNT,
            DEADLINE
        );
        deliveryHash = deliveryManager.getDeliveryHash(0);
    }

    function testCreateDelivery() public {
        bool shouldExist = deliveryManager.doesDeliveryExist(deliveryHash);
        Assert.equal(shouldExist, true, 'Delivery should exist');
    }

    function testGetDelivery() public {
        (
        DeliveryManager.DeliveryState state,
        address sender,
        address receiver,
        uint timestamp,
        uint startTime,
        uint endTime,
        bytes32 fromAddress,
        bytes32 toAddress,
        uint reward,
        uint cautionAmount,
        uint256 deadLine,
        address courier
        ) = deliveryManager.getDelivery(deliveryHash);
        Assert.equal(sender, deliveryManager.owner(), 'Delivery sender should be deployed address');
        Assert.equal(receiver, RECEIVER_ETH_ADDRESS, 'Delivery sender should be deployed address');
        Assert.equal(startTime, 0, 'Delivery startTime should be 0');
        Assert.equal(endTime, 0, 'Delivery endTime should be 0');
        Assert.equal(fromAddress, FROM_ADRESS, 'Delivery fromAddress should be the FROM_ADRESS');
        Assert.equal(toAddress, TO_ADDRESS, 'Delivery toAddress should be the TO_ADDRESS');
        Assert.equal(reward, REWARD, 'Delivery reward should be the REWARD');
        Assert.equal(cautionAmount, CAUTION_AMOUNT, 'Delivery cautionAmount should be the CAUTION_AMOUNT');
        Assert.equal(deadLine, DEADLINE, 'Delivery deadline should be the DEADLINE');
        Assert.equal(courier, address(0), 'Delivery courier should not exist yet');
        state; // avoid Warning: Unused local variable
        timestamp; // avoid Warning: Unused local variable
    }

    function testGetDeliveryCount() public {
        uint count = deliveryManager.getDeliveryCount();
        Assert.equal(count, 1, 'Delivery count should be 1');
    }

    function testGetUser() public {
        (
        DeliveryManager.DeliveryState state,
        address sender,
        address receiver,
        uint timestamp,
        uint startTime,
        uint endTime,
        bytes32 fromAddress,
        bytes32 toAddress,
        uint reward,
        uint cautionAmount,
        uint256 deadLine,
        address courier
        ) = deliveryManager.getDelivery(deliveryHash);

        (bytes32 senderName, bytes32 senderPhone, bytes32 senderEmail) = deliveryManager.getUser(sender);
        Assert.equal(senderName, SENDER_NAME, 'Wrong sender name');
        Assert.equal(senderPhone, SENDER_PHONE, 'Wrong sender phone');
        Assert.equal(senderEmail, SENDER_EMAIL, 'Wrong sender email');

        // avoid Warning: Unused local variable
        state;
        receiver;
        timestamp;
        startTime;
        endTime;
        fromAddress;
        toAddress;
        reward;
        cautionAmount;
        deadLine;
        courier;
    }

    function testApplyToDelivery() public {
        //
    }

    function testStartDelivery() public {
        //
    }

    function testSignReceip() public {
        //
    }

    function testChangeCommissionRate() public {
        uint _oldRate = deliveryManager.getCommissionRate();
        deliveryManager.changeCommissionRate(20);
        uint _newRate = deliveryManager.getCommissionRate();
        Assert.equal(_newRate, 20, 'New rate shoudl be 20');

        uint _rateForDelivery = deliveryManager.getCommissionRateForDelivery(deliveryHash);
        Assert.equal(_rateForDelivery, _oldRate, 'Should still be old rate');
    }

}