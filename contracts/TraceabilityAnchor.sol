// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title  TraceabilityAnchor
 * @notice Ancla registros de trazabilidad ganadera en la blockchain de forma
 *         inmutable. Cada registro contiene un hash del payload original
 *         almacenado en Supabase, lo que permite verificar que los datos no
 *         han sido alterados sin necesidad de guardar información sensible
 *         on-chain.
 *
 * @dev    Diseñado para Finca El Progreso (TFG - Universidad de los Andes).
 *         Red objetivo: Polygon Amoy testnet / Polygon mainnet.
 */
contract TraceabilityAnchor {

    // ─── Tipos ────────────────────────────────────────────────────────────────

    enum EntityType {
        Animal,        // 0 - registro de animal
        Vaccination,   // 1 - vacunación
        Weighing,      // 2 - pesaje
        Certification, // 3 - certificado de calidad/sanidad
        Sale,          // 4 - venta
        Treatment,     // 5 - tratamiento veterinario
        IoTReading     // 6 - lectura de sensor / oráculo
    }

    struct AnchorRecord {
        bytes32     entityId;    // UUID del registro en Supabase (como bytes32)
        bytes32     payloadHash; // SHA-256 del JSON canónico del registro
        EntityType  entityType;
        address     anchoredBy;  // wallet que ejecutó la transacción
        uint64      timestamp;   // bloque Unix timestamp
    }

    // ─── Estado ───────────────────────────────────────────────────────────────

    address public immutable owner;

    /// entityId → registro anclado
    mapping(bytes32 => AnchorRecord) private _records;

    /// lista de todos los entityIds anclados (para iterar)
    bytes32[] private _entityIds;

    // ─── Eventos ──────────────────────────────────────────────────────────────

    /**
     * @dev Emitido cada vez que se ancla un registro. Los exploradores de
     *      blockchain (Polygonscan) indexan este evento, lo que permite
     *      verificar públicamente la trazabilidad.
     */
    event Anchored(
        bytes32 indexed entityId,
        bytes32         payloadHash,
        EntityType      entityType,
        address indexed anchoredBy,
        uint64          timestamp
    );

    // ─── Errores ──────────────────────────────────────────────────────────────

    error NotOwner();
    error AlreadyAnchored(bytes32 entityId);
    error InvalidPayloadHash();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─── Modificadores ────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ─── Funciones principales ────────────────────────────────────────────────

    /**
     * @notice Ancla un registro de trazabilidad. Solo puede llamarlo el
     *         propietario del contrato (la wallet relayer del servidor).
     *
     * @param entityId    UUID del registro en Supabase convertido a bytes32.
     * @param payloadHash SHA-256 del JSON canónico del registro.
     * @param entityType  Tipo de entidad (Animal, Vaccination, etc.).
     */
    function anchor(
        bytes32    entityId,
        bytes32    payloadHash,
        EntityType entityType
    ) external onlyOwner {
        if (_records[entityId].timestamp != 0) revert AlreadyAnchored(entityId);
        if (payloadHash == bytes32(0))         revert InvalidPayloadHash();

        AnchorRecord memory rec = AnchorRecord({
            entityId:    entityId,
            payloadHash: payloadHash,
            entityType:  entityType,
            anchoredBy:  msg.sender,
            timestamp:   uint64(block.timestamp)
        });

        _records[entityId] = rec;
        _entityIds.push(entityId);

        emit Anchored(entityId, payloadHash, entityType, msg.sender, uint64(block.timestamp));
    }

    // ─── Funciones de lectura (gratuitas) ────────────────────────────────────

    /**
     * @notice Devuelve el registro anclado para un entityId dado.
     * @dev    Devuelve timestamp == 0 si el entityId no está anclado.
     */
    function getRecord(bytes32 entityId)
        external
        view
        returns (AnchorRecord memory)
    {
        return _records[entityId];
    }

    /**
     * @notice Verifica si el hash actual de un registro coincide con el
     *         anclado. Permite detectar si los datos fueron alterados.
     *
     * @param entityId    UUID del registro.
     * @param payloadHash Hash actual a comparar.
     * @return            true si el hash coincide (datos íntegros).
     */
    function verify(bytes32 entityId, bytes32 payloadHash)
        external
        view
        returns (bool)
    {
        return _records[entityId].payloadHash == payloadHash
            && _records[entityId].timestamp != 0;
    }

    /// @notice Número total de registros anclados.
    function totalAnchored() external view returns (uint256) {
        return _entityIds.length;
    }

    /// @notice Devuelve una página de entityIds anclados.
    function getEntityIds(uint256 offset, uint256 limit)
        external
        view
        returns (bytes32[] memory)
    {
        uint256 end = offset + limit;
        if (end > _entityIds.length) end = _entityIds.length;
        bytes32[] memory page = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = _entityIds[i];
        }
        return page;
    }
}
