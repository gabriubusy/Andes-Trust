// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

interface ITraceabilityAnchor {
    function verify(bytes32 entityId, bytes32 payloadHash) external view returns (bool);
}

/**
 * @title  PaymentEscrow
 * @notice RF-008 — Escrow de pagos en stablecoin liberado automáticamente
 *         cuando el historial sanitario de la venta está anclado en
 *         TraceabilityAnchor y coincide con el hash de condiciones acordado.
 *
 *         Flujo:
 *         1. owner (oráculo backend) llama `createEscrow` con saleId,
 *            comprador, vendedor, token ERC20, importe y hash de condiciones
 *            sanitarias acordadas.
 *         2. comprador llama `fundEscrow` (con `approve` previo del ERC20)
 *            transfiriendo el importe al contrato.
 *         3. cuando el animal cumple las condiciones, se ancla el payload
 *            sanitario en TraceabilityAnchor y se llama `release`. El
 *            contrato verifica que el payloadHash coincide con el hash de
 *            condiciones y que está anclado, antes de transferir al vendedor.
 *         4. si pasa el deadline sin liberación, comprador o owner pueden
 *            llamar `refund`.
 */
contract PaymentEscrow {

    enum Status { None, Created, Funded, Released, Refunded }

    struct Escrow {
        address buyer;
        address seller;
        address token;
        uint256 amount;
        bytes32 conditionsHash;
        uint64  deadline;
        Status  status;
    }

    address public immutable owner;
    ITraceabilityAnchor public immutable anchorContract;

    mapping(bytes32 => Escrow) public escrows;

    event EscrowCreated(bytes32 indexed saleId, address buyer, address seller, address token, uint256 amount, bytes32 conditionsHash, uint64 deadline);
    event EscrowFunded(bytes32 indexed saleId, address indexed by, uint256 amount);
    event EscrowReleased(bytes32 indexed saleId, address indexed seller, uint256 amount, bytes32 payloadHash);
    event EscrowRefunded(bytes32 indexed saleId, address indexed buyer, uint256 amount);

    error NotOwner();
    error NotBuyer();
    error InvalidStatus();
    error VerificationFailed();
    error HashMismatch();
    error DeadlineNotReached();
    error AlreadyExists();
    error InvalidParams();
    error TransferFailed();

    constructor(address _anchorContract) {
        if (_anchorContract == address(0)) revert InvalidParams();
        owner = msg.sender;
        anchorContract = ITraceabilityAnchor(_anchorContract);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function createEscrow(
        bytes32 saleId,
        address buyer,
        address seller,
        address token,
        uint256 amount,
        bytes32 conditionsHash,
        uint64  deadline
    ) external onlyOwner {
        if (escrows[saleId].status != Status.None) revert AlreadyExists();
        if (buyer == address(0) || seller == address(0) || token == address(0)) revert InvalidParams();
        if (amount == 0 || conditionsHash == bytes32(0) || deadline <= block.timestamp) revert InvalidParams();

        escrows[saleId] = Escrow({
            buyer: buyer,
            seller: seller,
            token: token,
            amount: amount,
            conditionsHash: conditionsHash,
            deadline: deadline,
            status: Status.Created
        });

        emit EscrowCreated(saleId, buyer, seller, token, amount, conditionsHash, deadline);
    }

    function fundEscrow(bytes32 saleId) external {
        Escrow storage e = escrows[saleId];
        if (e.status != Status.Created) revert InvalidStatus();
        if (msg.sender != e.buyer)      revert NotBuyer();

        bool ok = IERC20(e.token).transferFrom(e.buyer, address(this), e.amount);
        if (!ok) revert TransferFailed();

        e.status = Status.Funded;
        emit EscrowFunded(saleId, msg.sender, e.amount);
    }

    /**
     * @notice Libera el pago al vendedor. Requiere que el hash provisto
     *         coincida con `conditionsHash` y esté anclado en
     *         TraceabilityAnchor para `saleId`. Solo `owner` (oráculo
     *         backend) puede ejecutar — el vendedor no debe poder forzar
     *         la liberación aunque tenga el hash.
     */
    function release(bytes32 saleId, bytes32 payloadHash) external onlyOwner {
        Escrow storage e = escrows[saleId];
        if (e.status != Status.Funded)                 revert InvalidStatus();
        if (payloadHash != e.conditionsHash)           revert HashMismatch();
        if (!anchorContract.verify(saleId, payloadHash)) revert VerificationFailed();

        e.status = Status.Released;
        bool ok = IERC20(e.token).transfer(e.seller, e.amount);
        if (!ok) revert TransferFailed();

        emit EscrowReleased(saleId, e.seller, e.amount, payloadHash);
    }

    /**
     * @notice Devuelve los fondos al comprador tras pasar el deadline sin
     *         liberación. Llamable por comprador u owner.
     */
    function refund(bytes32 saleId) external {
        Escrow storage e = escrows[saleId];
        if (e.status != Status.Funded) revert InvalidStatus();
        if (block.timestamp < e.deadline) revert DeadlineNotReached();
        if (msg.sender != e.buyer && msg.sender != owner) revert NotBuyer();

        e.status = Status.Refunded;
        bool ok = IERC20(e.token).transfer(e.buyer, e.amount);
        if (!ok) revert TransferFailed();

        emit EscrowRefunded(saleId, e.buyer, e.amount);
    }

    function getEscrow(bytes32 saleId) external view returns (Escrow memory) {
        return escrows[saleId];
    }
}
