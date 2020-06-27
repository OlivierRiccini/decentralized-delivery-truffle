const DeliveryManager = artifacts.require('DeliveryManager');
const _ = require('lodash');
const moment = require('moment');

require('@openzeppelin/test-helpers/configure')({
    provider: 'http://localhost:8555',
});

const { time, expectEvent } = require('@openzeppelin/test-helpers');

const DeliveryState = {
    UNKNOWN: 0,
    PENDING: 1,
    AWAITING_PICKUP: 2,
    STARTED: 3,
    ENDED: 4,
    ENDED_OVERTIME: 5
};

contract('DeliveryManager', async accounts => {
    const CONTRACT_ONWER = accounts[0];
    let DELIVERY_NANAGER;
    let DELIVERY_HASH;
    const DELIVERY_CREATOR = accounts[1];
    const DELIVERY_APPLICANT = accounts[2];
    const DELIVERY_APPLICANT_2 = accounts[3];
    const DELIVERY_RECEIVER = accounts[4];

    const CONTRACT_MOCK_VARIABLES = {
        senderName: 'Olivier',
        senderPhone: '4382341122',
        senderEmail: 'olivier@test.com',
        receiverEthAddress: DELIVERY_RECEIVER,
        receiverName: 'Jano',
        receiverPhone: '4382341129',
        receiverEmail: 'jano@test.com',
        fromAddress: '1234 Main street',
        toAddress: '6789 Nice street',
        reward: '1',
        cautionAmount: '10',
        deadline: null
    };
    
    beforeEach(async () => {
        DELIVERY_NANAGER = await DeliveryManager.new();

        const latestBlockNumber = await web3.eth.getBlockNumber();
        const latestBlock = await web3.eth.getBlock(latestBlockNumber);
        const deadline  = moment(new Date(latestBlock.timestamp*1000)).add(2, 'days').unix();
        CONTRACT_MOCK_VARIABLES.deadline = deadline;

        const result = await DELIVERY_NANAGER.createDelivery(
            web3.utils.fromAscii(CONTRACT_MOCK_VARIABLES.senderName),
            web3.utils.fromAscii(CONTRACT_MOCK_VARIABLES.senderPhone),
            web3.utils.fromAscii(CONTRACT_MOCK_VARIABLES.senderEmail),
            CONTRACT_MOCK_VARIABLES.receiverEthAddress,
            web3.utils.fromAscii(CONTRACT_MOCK_VARIABLES.receiverName),
            web3.utils.fromAscii(CONTRACT_MOCK_VARIABLES.receiverPhone),
            web3.utils.fromAscii(CONTRACT_MOCK_VARIABLES.receiverEmail),
            web3.utils.fromAscii(CONTRACT_MOCK_VARIABLES.fromAddress), 
            web3.utils.fromAscii(CONTRACT_MOCK_VARIABLES.toAddress),
            web3.utils.toWei(CONTRACT_MOCK_VARIABLES.reward, 'ether'),
            web3.utils.toWei(CONTRACT_MOCK_VARIABLES.cautionAmount, 'ether'),
            CONTRACT_MOCK_VARIABLES.deadline,
            { from: DELIVERY_CREATOR }
        );
        DELIVERY_HASH = result.logs[0].args._deliveryHash;
    });

    it(`POSITIVE - should create delivery`, async () => {
        // already created in the beforeEach hook, so just cheking
        const isCreated = await DELIVERY_NANAGER.doesDeliveryExist(DELIVERY_HASH);
        assert.isTrue(isCreated);
    });

    it(`POSITIVE - should return true if delivery exists and false if not`, async () => {
        const shouldBeTrue = await DELIVERY_NANAGER.doesDeliveryExist(DELIVERY_HASH);
        assert.isTrue(shouldBeTrue);

        const unkownHash = '0xe6b0ad1e3f748f825862f31c550a4e96079be04358bd9e27494946e0ae55fc99';
        const shouldBeFalse = await DELIVERY_NANAGER.doesDeliveryExist(unkownHash);
        assert.isTrue(!shouldBeFalse);
    });

    it(`POSITIVE - should get delivery from delivery hash`, async () => {
        const delivery = await DELIVERY_NANAGER.getDelivery(DELIVERY_HASH);
        assert.equal(+delivery.state, DeliveryState.PENDING);
        assert.equal(delivery.sender, DELIVERY_CREATOR);
        assert.equal(delivery.receiver, web3.utils.toChecksumAddress(CONTRACT_MOCK_VARIABLES.receiverEthAddress));
        assert.equal(delivery.startTime, 0);
        assert.equal(delivery.endTime, 0);
        assert.equal(web3.utils.toUtf8(delivery.fromAddress), CONTRACT_MOCK_VARIABLES.fromAddress);
        assert.equal(web3.utils.toUtf8(delivery.toAddress), CONTRACT_MOCK_VARIABLES.toAddress);
        assert.equal(delivery.reward, web3.utils.toWei(CONTRACT_MOCK_VARIABLES.reward, 'ether'));
        assert.equal(+delivery.cautionAmount, web3.utils.toWei(CONTRACT_MOCK_VARIABLES.cautionAmount, 'ether'));
        assert.equal(+delivery.deadline, CONTRACT_MOCK_VARIABLES.deadline);
    });

    it(`POSITIVE - should get delivery count`, async () => {
        let count = await DELIVERY_NANAGER.getDeliveryCount();
        assert.equal(+count, 1);

        // create a new one
        const senderName = web3.utils.fromAscii('Blabla');
        const senderPhone = web3.utils.fromAscii('4382341122');
        const senderEmail = web3.utils.fromAscii('olivier@test.com');
        const receiverEthAddress = '0xc1912fee45d61c87cc5ea59dae31190fffff2329';
        const receiverName = web3.utils.fromAscii('Jano');
        const receiverPhone = web3.utils.fromAscii('4382341129');
        const receiverEmail = web3.utils.fromAscii('jano@test.com');
        const fromAddress = web3.utils.fromAscii('566 New street'); 
        const toAddress = web3.utils.fromAscii('767 Another street');
        const reward = '2';
        const cautionAmount = '20';
        const deadline = new Date().getTime() + 86400;

        await DELIVERY_NANAGER.createDelivery(
            senderName,
            senderPhone,
            senderEmail,
            receiverEthAddress,
            receiverName,
            receiverPhone,
            receiverEmail,
            fromAddress,
            toAddress,
            web3.utils.toWei(reward, 'ether'),
            web3.utils.toWei(cautionAmount, 'ether'),
            deadline
        );
        count = await DELIVERY_NANAGER.getDeliveryCount();
        assert.equal(+count, 2);
    });

    it(`POSITIVE - should get all deliveries`, async () => {
        // create a new one
        const senderName = web3.utils.fromAscii('Blabla');
        const senderPhone = web3.utils.fromAscii('4382341122');
        const senderEmail = web3.utils.fromAscii('olivier@test.com');
        const receiverEthAddress = '0xc1912fee45d61c87cc5ea59dae31190fffff2329';
        const receiverName = web3.utils.fromAscii('Jano');
        const receiverPhone = web3.utils.fromAscii('4382341129');
        const receiverEmail = web3.utils.fromAscii('jano@test.com');
        const fromAddress = web3.utils.fromAscii('566 New street'); 
        const toAddress = web3.utils.fromAscii('767 Another street');
        const reward = '25';
        const cautionAmount = '20';
        const deadline = 86400;

        await DELIVERY_NANAGER.createDelivery(
            senderName,
            senderPhone,
            senderEmail,
            receiverEthAddress,
            receiverName,
            receiverPhone,
            receiverEmail,
            fromAddress,
            toAddress,
            web3.utils.toWei(reward, 'ether'),
            web3.utils.toWei(cautionAmount, 'ether'),
            deadline
        );

        const deliveries = [];

        const deliveryCount = await DELIVERY_NANAGER.getDeliveryCount();
        for (let i = 0; i < deliveryCount; i++) {
            const hash = await DELIVERY_NANAGER.getDeliveryHash(i);
            let delivery = await DELIVERY_NANAGER.getDelivery(hash);
            delivery = _.pick(
                delivery,
                ['state', 'sender', 'timestamp', 'fromAddress', 'toAddress', 'reward', 'cautionAmount', 'courier']
            );
            deliveries.push(delivery);
        }
        assert.equal(+deliveryCount, deliveries.length);
    });

    it(`POSITIVE - should get sender and receiver info from delivery hash`, async () => {
        const delivery = await DELIVERY_NANAGER.getDelivery(DELIVERY_HASH);

        const senderInfo = await DELIVERY_NANAGER.getUser(delivery.sender);
        assert.equal(web3.utils.toUtf8(senderInfo.name), CONTRACT_MOCK_VARIABLES.senderName);
        assert.equal(web3.utils.toUtf8(senderInfo.phone), CONTRACT_MOCK_VARIABLES.senderPhone);
        assert.equal(web3.utils.toUtf8(senderInfo.email), CONTRACT_MOCK_VARIABLES.senderEmail);

        const receiverInfo = await DELIVERY_NANAGER.getUser(delivery.receiver);
        assert.equal(web3.utils.toUtf8(receiverInfo.name), CONTRACT_MOCK_VARIABLES.receiverName);
        assert.equal(web3.utils.toUtf8(receiverInfo.phone), CONTRACT_MOCK_VARIABLES.receiverPhone);
        assert.equal(web3.utils.toUtf8(receiverInfo.email), CONTRACT_MOCK_VARIABLES.receiverEmail);
    });

    it(`POSITIVE - should be able to apply if the amount of the caution is equal than the one asked by the sender`, async () => {
        const applicantEthAddress = DELIVERY_APPLICANT;
        const applicantName = web3.utils.fromAscii('Martin');
        const applicantPhone = web3.utils.fromAscii('4382341120');
        const applicantEmail = web3.utils.fromAscii('martin@test.com');
        const cautionAmount = web3.utils.toWei(CONTRACT_MOCK_VARIABLES.cautionAmount, 'ether');

        let contractBalance = await web3.eth.getBalance(DELIVERY_NANAGER.address);
        assert.equal(contractBalance, 0);

        let applicantBalance = await web3.eth.getBalance(applicantEthAddress);
        assert.equal(applicantBalance, web3.utils.toWei('100', 'ether'));

        const result = await DELIVERY_NANAGER.applyToDelivery(DELIVERY_HASH, applicantName, applicantPhone, applicantEmail, {from: applicantEthAddress, value: cautionAmount});
        
        const tx = await web3.eth.getTransaction(result.tx);
        const gasCost = tx.gasPrice * result.receipt.gasUsed;

        applicantBalance = await web3.eth.getBalance(applicantEthAddress);
        const expectedBalance =  web3.utils.toWei('100', 'ether') - web3.utils.toWei(CONTRACT_MOCK_VARIABLES.cautionAmount, 'ether') - gasCost;
        assert.equal(applicantBalance, expectedBalance);
        
        const updatedDelivery = await DELIVERY_NANAGER.getDelivery(DELIVERY_HASH);
        assert.equal(+updatedDelivery.state, DeliveryState.AWAITING_PICKUP);

        contractBalance = await web3.eth.getBalance(DELIVERY_NANAGER.address);
        assert.equal(contractBalance, cautionAmount);

    });

    it(`POSITIVE - should be able to start delivery`, async () => {
        const applicantEthAddress = DELIVERY_APPLICANT;
        const applicantName = web3.utils.fromAscii('Martin');
        const applicantPhone = web3.utils.fromAscii('4382341120');
        const applicantEmail = web3.utils.fromAscii('martin@test.com');
        const cautionAmount = web3.utils.toWei(CONTRACT_MOCK_VARIABLES.cautionAmount, 'ether');
        const reward =  web3.utils.toWei(CONTRACT_MOCK_VARIABLES.reward, 'ether');

        await DELIVERY_NANAGER.applyToDelivery(DELIVERY_HASH, applicantName, applicantPhone, applicantEmail, {from: applicantEthAddress, value: cautionAmount});
        
        const creatorBalanceBefore = await web3.eth.getBalance(DELIVERY_CREATOR);
        const contractBalanceBefore = await web3.eth.getBalance(DELIVERY_NANAGER.address);
        
        const startDeliveryRes = await DELIVERY_NANAGER.startDelivery(DELIVERY_HASH, {from: DELIVERY_CREATOR, value: reward});
        const startTime = startDeliveryRes.logs[0].args._startTime;

        const tx = await web3.eth.getTransaction(startDeliveryRes.tx);
        const gasCost = +tx.gasPrice * +startDeliveryRes.receipt.gasUsed;

        const updatedDelivery = await DELIVERY_NANAGER.getDelivery(DELIVERY_HASH);
        assert.equal(+updatedDelivery.state, DeliveryState.STARTED);
        assert.equal(+updatedDelivery.startTime, +startTime);

        // const contractBalanceAfter = await web3.eth.getBalance(DELIVERY_NANAGER.address);
        // assert.equal(+contractBalanceAfter, +contractBalanceBefore + +updatedDelivery.reward);
        
        // const creatorBalanceAfter = await web3.eth.getBalance(DELIVERY_CREATOR);
        // const expectedCreatorBalance = +creatorBalanceBefore - reward - gasCost;
        // assert.equal(+creatorBalanceAfter, expectedCreatorBalance);
    });

    it(`POSITIVE - should be able to sign and end rhe delivery if receiver`, async () => {
        const applicantEthAddress = DELIVERY_APPLICANT;
        const applicantName = web3.utils.fromAscii('Martin');
        const applicantPhone = web3.utils.fromAscii('4382341120');
        const applicantEmail = web3.utils.fromAscii('martin@test.com');
        const cautionAmount = web3.utils.toWei(CONTRACT_MOCK_VARIABLES.cautionAmount, 'ether');
        const reward =  web3.utils.toWei(CONTRACT_MOCK_VARIABLES.reward, 'ether');

        const creatorBalanceBefore = await web3.eth.getBalance(DELIVERY_CREATOR);
        const contractBalanceBefore = await web3.eth.getBalance(DELIVERY_NANAGER.address);
        const courierBalanceBefore = await web3.eth.getBalance(applicantEthAddress);
        const contractOwnerBalanceBefore = await web3.eth.getBalance(CONTRACT_ONWER);

        const applyToDeliveryRes = await DELIVERY_NANAGER.applyToDelivery(DELIVERY_HASH, applicantName, applicantPhone, applicantEmail, {from: applicantEthAddress, value: cautionAmount});
        const startDeliveryRes = await DELIVERY_NANAGER.startDelivery(DELIVERY_HASH, {from: DELIVERY_CREATOR, value: reward});
        const signReceipRes = await DELIVERY_NANAGER.signReceip(DELIVERY_HASH, {from: DELIVERY_RECEIVER});
        const endTime = signReceipRes.logs[0].args._endTime;
        const updatedDelivery = await DELIVERY_NANAGER.getDelivery(DELIVERY_HASH);
        let commissionRate = await DELIVERY_NANAGER.getCommissionRateForDelivery(DELIVERY_HASH);
        commissionRate = commissionRate / 100;

        assert.equal(+updatedDelivery.state, DeliveryState.ENDED);
        assert.equal(+updatedDelivery.endTime, +endTime);

        const startDeliveryResTx = await web3.eth.getTransaction(startDeliveryRes.tx);
        const startDeliveryResTxGasCost = startDeliveryResTx.gasPrice * startDeliveryRes.receipt.gasUsed;

        // const contractBalanceAfter = await web3.eth.getBalance(DELIVERY_NANAGER.address);
        // assert.equal(+contractBalanceAfter, +contractBalanceBefore - reward - cautionAmount);
        
        const applyToDeliveryResTx = await web3.eth.getTransaction(applyToDeliveryRes.tx);
        const applyToDeliveryResTxGasCost = applyToDeliveryResTx.gasPrice * applyToDeliveryRes.receipt.gasUsed;
        
        const courierBalanceAfter = await web3.eth.getBalance(applicantEthAddress);
        const commissionAmount = reward * commissionRate;
        const finalReward = reward - commissionAmount;

        // const courierBalanceExpected = +courierBalanceBefore + finalReward - +applyToDeliveryResTxGasCost;
        // assert.equal(+courierBalanceAfter, courierBalanceExpected);
        
        // const contractOwnerBalanceAfter = await web3.eth.getBalance(CONTRACT_ONWER);
        // const contractOwnerBalanceExpected = contractOwnerBalanceBefore + reward * CONTRACT_OWNER_COMMISSION_RATE;
        // assert.equal(contractOwnerBalanceAfter, contractOwnerBalanceExpected);

        const creatorBalanceAfter = await web3.eth.getBalance(DELIVERY_CREATOR);
        assert.equal(+creatorBalanceAfter, +creatorBalanceBefore - reward - startDeliveryResTxGasCost);
        
    });


    /// THIS ONE ///
    it(`POSITIVE - should be able to end and cash out caution if delivery is not on time`, async () => {
        const applicantEthAddress = DELIVERY_APPLICANT;
        const applicantName = web3.utils.fromAscii('Martin');
        const applicantPhone = web3.utils.fromAscii('4382341120');
        const applicantEmail = web3.utils.fromAscii('martin@test.com');
        const cautionAmount = web3.utils.toWei(CONTRACT_MOCK_VARIABLES.cautionAmount, 'ether');
        const reward =  web3.utils.toWei(CONTRACT_MOCK_VARIABLES.reward, 'ether');

        const creatorBalanceBefore = await web3.eth.getBalance(DELIVERY_CREATOR);
        const contractBalanceBefore = await web3.eth.getBalance(DELIVERY_NANAGER.address);
        const courierBalanceBefore = await web3.eth.getBalance(applicantEthAddress);
        
        const applicationReceip = await DELIVERY_NANAGER.applyToDelivery(DELIVERY_HASH, applicantName, applicantPhone, applicantEmail, {from: applicantEthAddress, value: cautionAmount});
        const applicationGasFee = applicationReceip.receipt.gasUsed * 1;

        // console.log('************** applicationGasFee ****************** ', applicationGasFee);

        const startDeliveryReceip = await DELIVERY_NANAGER.startDelivery(DELIVERY_HASH, {from: DELIVERY_CREATOR, value: reward});
        const startDeliveryGasFee = startDeliveryReceip.receipt.gasUsed * 1;
        // console.log('************** startDeliveryGasFee ****************** ', startDeliveryGasFee);
        const creatorBalanceWhile = await web3.eth.getBalance(DELIVERY_CREATOR);
        const contractBalanceWhile = await web3.eth.getBalance(DELIVERY_NANAGER.address);
        const courierBalanceWhile = await web3.eth.getBalance(applicantEthAddress);

        // assert.equal(+creatorBalanceWhile, (+creatorBalanceBefore - +reward - +startDeliveryGasFee));
        assert.equal(+contractBalanceWhile, (+contractBalanceBefore + +reward + +cautionAmount));
        // assert.equal(+courierBalanceWhile, (+courierBalanceBefore - +cautionAmount - +applicationGasFee));
        
        try {
            await time.increase(time.duration.days(4));
            const isOverTimeReceip = await DELIVERY_NANAGER.triggerIsOverTime(DELIVERY_HASH, {from: DELIVERY_CREATOR});
            const isOverTimeReceipGasFee = isOverTimeReceip.receipt.gasUsed * 1;
            // console.log('************** isOverTimeReceipGasFee ****************** ', isOverTimeReceipGasFee);
            expectEvent(isOverTimeReceip, 'DeadlineCheck', { _isOnTime: false });
            const creatorBalanceAfter = await web3.eth.getBalance(DELIVERY_CREATOR);
            const contractBalanceAfter = await web3.eth.getBalance(DELIVERY_NANAGER.address);
            const courierBalanceAfter = await web3.eth.getBalance(applicantEthAddress);

            // assert.equal(+creatorBalanceAfter, (+creatorBalanceWhile + +cautionAmount + +reward - +isOverTimeReceipGasFee));
            assert.equal(+contractBalanceAfter, +contractBalanceBefore);
            // assert.equal(+courierBalanceAfter, +courierBalanceWhile);

        } catch (err) {
            assert.fail();
        }
    });

    it(`NEGATIVE - should not be able to end and cash out caution if delivery has not started yet`, async () => {
        const ERROR_MSG ='Returned error: VM Exception while processing transaction: revert Delivery has not started yet! -- Reason given: Delivery has not started yet!.'

        const applicantEthAddress = DELIVERY_APPLICANT;
        const applicantName = web3.utils.fromAscii('Martin');
        const applicantPhone = web3.utils.fromAscii('4382341120');
        const applicantEmail = web3.utils.fromAscii('martin@test.com');
        const cautionAmount = web3.utils.toWei(CONTRACT_MOCK_VARIABLES.cautionAmount, 'ether');
        
        await DELIVERY_NANAGER.applyToDelivery(DELIVERY_HASH, applicantName, applicantPhone, applicantEmail, {from: applicantEthAddress, value: cautionAmount});

        try {
            await DELIVERY_NANAGER.triggerIsOverTime(DELIVERY_HASH, {from: DELIVERY_CREATOR});
            assert.fail();
        } catch (err) {
            assert.equal(err.message, ERROR_MSG);
            assert.ok(/revert/.test(err.message));
        }
    });

    it(`NEGATIVE - should not be able to end and cash out caution if delivery is on time`, async () => {
        const applicantEthAddress = DELIVERY_APPLICANT;
        const applicantName = web3.utils.fromAscii('Martin');
        const applicantPhone = web3.utils.fromAscii('4382341120');
        const applicantEmail = web3.utils.fromAscii('martin@test.com');
        const cautionAmount = web3.utils.toWei(CONTRACT_MOCK_VARIABLES.cautionAmount, 'ether');
        const reward =  web3.utils.toWei(CONTRACT_MOCK_VARIABLES.reward, 'ether');
        
        await DELIVERY_NANAGER.applyToDelivery(DELIVERY_HASH, applicantName, applicantPhone, applicantEmail, {from: applicantEthAddress, value: cautionAmount});
        await DELIVERY_NANAGER.startDelivery(DELIVERY_HASH, {from: DELIVERY_CREATOR, value: reward});

        try {
            await time.increase(time.duration.days(1)); // on time
            const result = await DELIVERY_NANAGER.triggerIsOverTime(DELIVERY_HASH, {from: DELIVERY_CREATOR});
            expectEvent(result, 'DeadlineCheck', { _isOnTime: true });
        } catch (err) {
            console.log(err)
            assert.fail();
        }
    });

    it(`NEGATIVE - should not be able to end and cash out caution if it's not from sender`, async () => {
        const ERROR_MSG = 'Returned error: VM Exception while processing transaction: revert Only the creator of the delivery can perform this action. -- Reason given: Only the creator of the delivery can perform this action..';
        
        const applicantEthAddress = DELIVERY_APPLICANT;
        const applicantName = web3.utils.fromAscii('Martin');
        const applicantPhone = web3.utils.fromAscii('4382341120');
        const applicantEmail = web3.utils.fromAscii('martin@test.com');
        const cautionAmount = web3.utils.toWei(CONTRACT_MOCK_VARIABLES.cautionAmount, 'ether');
        const reward =  web3.utils.toWei(CONTRACT_MOCK_VARIABLES.reward, 'ether');
        
        await DELIVERY_NANAGER.applyToDelivery(DELIVERY_HASH, applicantName, applicantPhone, applicantEmail, {from: applicantEthAddress, value: cautionAmount});
        await DELIVERY_NANAGER.startDelivery(DELIVERY_HASH, {from: DELIVERY_CREATOR, value: reward});

        try {
            await DELIVERY_NANAGER.triggerIsOverTime(DELIVERY_HASH, {from: DELIVERY_APPLICANT_2});
            assert.fail();
        } catch (err) {
            assert.equal(err.message, ERROR_MSG);
            assert.ok(/revert/.test(err.message));
        }
    });

    it(`POSITIVE - should be able to change commission rate if contract owner`, async () => {
        const commissionRateTx = await DELIVERY_NANAGER.changeCommissionRate(20);
        const newRateFromEmittedEvent = commissionRateTx.logs[0].args._newCommissionRate;
        assert.equal(newRateFromEmittedEvent, 20);
        const newRateFromGetFunction = await DELIVERY_NANAGER.getCommissionRate();
        assert.equal(newRateFromGetFunction, 20);
    });

    it(`POSITIVE - should old commission applicable if it changed after delivery creation`, async () => {
        const oldRate = await DELIVERY_NANAGER.getCommissionRate();

        const commissionRateTx = await DELIVERY_NANAGER.changeCommissionRate(20);
        const newRateFromEmittedEvent = commissionRateTx.logs[0].args._newCommissionRate;
        assert.equal(newRateFromEmittedEvent, 20);
        const newRateFromGetFunction = await DELIVERY_NANAGER.getCommissionRate();
        assert.equal(newRateFromGetFunction, 20);

        const rateForDelivery = await DELIVERY_NANAGER.getCommissionRateForDelivery(DELIVERY_HASH);
        assert.equal(+rateForDelivery, +oldRate);
    });

    it(`NEGATIVE - should not be able to change commission rate if not contract owner`, async () => {
        const ERROR_MSG = 'Returned error: VM Exception while processing transaction: revert Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.';
        try {
            await DELIVERY_NANAGER.changeCommissionRate(20, {from: DELIVERY_CREATOR})
            assert.fail();
        } catch (err) {
            assert.equal(err.message, ERROR_MSG);
            assert.ok(/revert/.test(err.message));
        }
    });

});