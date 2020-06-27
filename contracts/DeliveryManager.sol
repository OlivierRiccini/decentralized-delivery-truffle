pragma solidity ^0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";

contract DeliveryManager is Ownable {
    enum DeliveryState {
        UNKNOWN,
        PENDING,
        AWAITING_PICKUP,
        STARTED,
        ENDED,
        ENDED_OVERTIME
    }

    struct User {
        bytes32 name;
        bytes32 phone;
        bytes32 email;
    }

    struct Delivery {
        bool exists;
        uint nonce;
        DeliveryState state;
        address payable sender;
        address receiver;
        uint timestamp;
        uint startTime;
        uint endTime;
        bytes32 fromAddress;
        bytes32 toAddress;
        uint reward;
        uint commissionRate;
        uint cautionAmount;
        uint256 deadline;
        address payable courier;
    }

    uint private commissionRate;
    bytes32[] private deliveryHashes;

    mapping(bytes32 => Delivery) private deliveries;
    mapping(address => User) private users;

    event DeliveryCreated(bytes32 _deliveryHash);
    event NewDeliveryApplication(bytes32 _deliveryHash, address _applicant);
    event DeliveryStarted(bytes32 _deliveryHash, uint _startTime);
    event DeliveryEnded(bytes32 _deliveryHash, uint _endTime);
    event CommissionRateChanged(uint _newCommissionRate);
    event DeadlineCheck(bool _isOnTime);

    constructor() public {
        commissionRate = 10;
    }

    modifier onlyDeliveryCreator(bytes32 _deliveryHash) {
        address _deliveryCreator = deliveries[_deliveryHash].sender;
        require(msg.sender == _deliveryCreator, 'Only the creator of the delivery can perform this action.');
        _;
    }

    modifier onlyDeliveryReceiver(bytes32 _deliveryHash) {
        address _deliveryReceiver = deliveries[_deliveryHash].receiver;
        require(msg.sender == _deliveryReceiver, 'Only the receiver of the delivery can perform this action.');
        _;
    }

    function createDelivery(
        bytes32 _senderName,
        bytes32 _senderPhone,
        bytes32 _senderEmail,
        address _receiverEthAddress,
        bytes32 _receiverName,
        bytes32 _receiverPhone,
        bytes32 _receiverEmail,
        bytes32 _fromAddress,
        bytes32 _toAddress,
        uint _reward,
        uint _cautionAmount,
        uint256 _deadline // epoch Date
        ) public {

        _addUser(msg.sender, _senderName, _senderPhone, _senderEmail);
        _addUser(_receiverEthAddress, _receiverName, _receiverPhone, _receiverEmail);

        Delivery memory _delivery = Delivery(
            true,
            deliveryHashes.length + 1,
            DeliveryState.PENDING,
            msg.sender,
            _receiverEthAddress,
            now,
            0,
            0,
            _fromAddress,
            _toAddress,
            _reward,
            commissionRate,
            _cautionAmount,
            _deadline,
            address(0)
        );
        bytes32 deliveryHash = _generateDeliveryHash(
            _delivery.nonce,
            _delivery.receiver,
            _delivery.timestamp,
            _delivery.fromAddress,
            _delivery.toAddress,
            _delivery.reward,
            _delivery.commissionRate,
            _delivery.cautionAmount,
            _delivery.deadline
        );

        deliveries[deliveryHash] = _delivery;
        deliveryHashes.push(deliveryHash);
        emit DeliveryCreated(deliveryHash);
    }

    function getDelivery(bytes32 _deliveryHash) public view returns (
        DeliveryState state,
        address sender,
        address receiver,
        uint timestamp,
        uint startTime,
        uint endTime,
        bytes32 fromAddress,
        bytes32 toAddress,
        uint reward,
        uint cautionAmount,
        uint256 deadline,
        address payable courier
    ) {
        Delivery memory _delivery = deliveries[_deliveryHash];
        return (
            _delivery.state,
            _delivery.sender,
            _delivery.receiver,
            _delivery.timestamp,
            _delivery.startTime,
            _delivery.endTime,
            _delivery.fromAddress,
            _delivery.toAddress,
            _delivery.reward,
            _delivery.cautionAmount,
            _delivery.deadline,
            _delivery.courier
        );
    }

    function getDeliveryHash(uint _index) public view returns (bytes32) {
        return deliveryHashes[_index];
    }

    function getDeliveryCount() public view returns (uint) {
        return deliveryHashes.length;
    }

    function getCommissionRateForDelivery(bytes32 _deliveryHash) public view returns (uint) {
        return deliveries[_deliveryHash].commissionRate;
    }

    function doesDeliveryExist(bytes32 _deliveryHash) public view returns (bool) {
        return deliveries[_deliveryHash].exists;
    }

    function getUser(address _userEthAddress) public view returns (bytes32 name, bytes32 phone, bytes32 email) {
        User memory user = users[_userEthAddress];
        return (user.name, user.phone, user.email);
    }

    function applyToDelivery(bytes32 _deliveryHash, bytes32 _applicantName, bytes32 _applicantPhone, bytes32 _applicantEmail) public payable {
        require(msg.value == deliveries[_deliveryHash].cautionAmount, 'Value should be equal to caution amount');
        address payable _newCourier = msg.sender;
        _addUser(_newCourier, _applicantName, _applicantPhone, _applicantEmail);
        _changeDeliveryState(_deliveryHash, DeliveryState.AWAITING_PICKUP);
        _assignCourier(_deliveryHash, _newCourier);

        emit NewDeliveryApplication(_deliveryHash, _newCourier);
    }

    function startDelivery(bytes32 _deliveryHash) public payable onlyDeliveryCreator(_deliveryHash) {
        require(msg.value == deliveries[_deliveryHash].reward, 'Value should be equal to reward amount');
        _changeDeliveryState(_deliveryHash, DeliveryState.STARTED);
        _addStartTime(_deliveryHash);
        emit DeliveryStarted(_deliveryHash, deliveries[_deliveryHash].startTime);
    }

    function signReceip(bytes32 _deliveryHash) public onlyDeliveryReceiver(_deliveryHash) {
        _endDelivery(_deliveryHash, false);
        emit DeliveryEnded(_deliveryHash, deliveries[_deliveryHash].endTime);
    }

    function changeCommissionRate(uint _newRate) public onlyOwner() {
        commissionRate = _newRate;
        emit CommissionRateChanged(_newRate);
    }

    function triggerIsOverTime(bytes32 _deliveryHash) public payable onlyDeliveryCreator(_deliveryHash) {
        require(deliveries[_deliveryHash].startTime > 0, 'Delivery has not started yet!');
        bool _isOnTime = block.timestamp <= deliveries[_deliveryHash].deadline;
        if (!_isOnTime) {
            _endDelivery(_deliveryHash, true);
        }
        emit DeadlineCheck(_isOnTime);
    }

    function getCommissionRate() public view returns (uint) {
        return commissionRate;
    }

    function _addUser(address _address, bytes32 _name, bytes32 _phone, bytes32 _email) private {
        users[_address] = User(_name, _phone, _email);
    }

    function _generateDeliveryHash(
        uint _nonce,
        address _receiverEthAddress,
        uint _timestamp,
        bytes32 _fromAddress,
        bytes32 _toAddress,
        uint _reward,
        uint _commissionRate,
        uint _cautionAmount,
        uint256 _deadline
    ) private view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                _nonce,
                msg.sender,
                _receiverEthAddress,
                _timestamp,
                _fromAddress,
                _toAddress,
                _reward,
                _commissionRate,
                _cautionAmount,
                _deadline
            )
        );
    }

    function _changeDeliveryState(bytes32 _deliveryHash, DeliveryState _newState) private {
        deliveries[_deliveryHash].state = _newState;
    }

    function _assignCourier(bytes32 _deliveryHash, address payable _courier) private {
        deliveries[_deliveryHash].courier = _courier;
    }

    function _addStartTime(bytes32 _deliveryHash) private {
        deliveries[_deliveryHash].startTime = now;
    }

    function _addEndTime(bytes32 _deliveryHash) private {
        deliveries[_deliveryHash].endTime = now;
    }

    function _endDelivery(bytes32 _deliveryHash, bool _isOverTime) private {
        if (_isOverTime) {
            _cashDeposit(_deliveryHash);
            _changeDeliveryState(_deliveryHash, DeliveryState.ENDED_OVERTIME);
        } else {
            _payCourier(_deliveryHash);
            _changeDeliveryState(_deliveryHash, DeliveryState.ENDED);
        }
        _addEndTime(_deliveryHash);

        emit DeliveryEnded(_deliveryHash, deliveries[_deliveryHash].endTime);
    }

    function _payCourier(bytes32 _deliveryHash) private {
        address payable _courier = deliveries[_deliveryHash].courier;
        uint _reward = deliveries[_deliveryHash].reward;
        uint _contractOwnerCommission = _reward * commissionRate / 100;
        uint _finalReward = _reward - _contractOwnerCommission;
        uint _finalAmountToTransfer = _finalReward + deliveries[_deliveryHash].cautionAmount;
        _courier.transfer(_finalAmountToTransfer);
    }

    function _cashDeposit(bytes32 _deliveryHash) private {
        address payable _sender = deliveries[_deliveryHash].sender;
        uint _reward = deliveries[_deliveryHash].reward;
        uint _finalAmountToTransfer = _reward + deliveries[_deliveryHash].cautionAmount;
        _sender.transfer(_finalAmountToTransfer);
    }

}