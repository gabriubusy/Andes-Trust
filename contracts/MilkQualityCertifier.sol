// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title  MilkQualityCertifier
 * @notice Certifica automáticamente la calidad láctea de un período de
 *         producción según estándares COVENIN 903 (Venezuela).
 *
 *         El contrato evalúa on-chain los parámetros de calidad (grasa,
 *         proteína, células somáticas) y emite una certificación inmutable
 *         con grado A / B / C. El payload hash de los registros de producción
 *         se ancla para garantizar integridad de datos.
 *
 * @dev    Finca El Progreso — TFG Universidad de los Andes.
 *         Red: Polygon Amoy testnet.
 */
contract MilkQualityCertifier {

    // ─── Tipos ────────────────────────────────────────────────────────────────

    /// @notice Grado de calidad según COVENIN 903
    enum QualityGrade {
        A,  // 0 — Óptima: grasa ≥ 3.2%, proteína ≥ 2.8%, SCC ≤ 400k
        B,  // 1 — Aceptable: parámetros compositivos bajos pero SCC ok
        C   // 2 — Observación: SCC elevado (> 400k células/mL)
    }

    struct QualityCert {
        bytes32      certId;       // UUID de la cert en Supabase (bytes32)
        bytes32      farmId;       // UUID de la finca
        bytes32      payloadHash;  // keccak256 del JSON canónico de registros
        QualityGrade grade;        // Grado evaluado on-chain
        uint32       fatPct100;    // grasa% × 100 (e.g. 320 = 3.20%)
        uint32       proteinPct100;// proteína% × 100
        uint32       sccThousands; // SCC en miles (e.g. 350 = 350 000 cél/mL)
        uint32       totalLiters;  // litros totales del período
        uint64       periodStart;  // unix timestamp inicio período
        uint64       periodEnd;    // unix timestamp fin período
        address      certifiedBy;  // wallet relayer que ejecutó
        uint64       timestamp;    // bloque unix timestamp
    }

    // ─── Estado ───────────────────────────────────────────────────────────────

    address public immutable owner;

    /// certId → certificación
    mapping(bytes32 => QualityCert) private _certs;

    /// lista de todas las certIds emitidas
    bytes32[] private _certIds;

    // ─── Eventos ──────────────────────────────────────────────────────────────

    /**
     * @dev Emitido al certificar un período. Indexado para consulta pública
     *      en Polygonscan y verificadores externos.
     */
    event MilkQualityCertified(
        bytes32 indexed certId,
        bytes32 indexed farmId,
        bytes32         payloadHash,
        QualityGrade    grade,
        uint32          fatPct100,
        uint32          proteinPct100,
        uint32          sccThousands,
        uint32          totalLiters,
        uint64          periodStart,
        uint64          periodEnd,
        address indexed certifiedBy,
        uint64          timestamp
    );

    // ─── Errores ──────────────────────────────────────────────────────────────

    error NotOwner();
    error AlreadyCertified(bytes32 certId);
    error InvalidPayloadHash();
    error InvalidPeriod();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ─── Función principal ────────────────────────────────────────────────────

    /**
     * @notice Certifica un período de producción láctea on-chain.
     *         El grado se calcula aquí mismo a partir de los parámetros,
     *         no se recibe desde el exterior — garantía de objetividad.
     *
     * @param certId         UUID de la cert (bytes32)
     * @param farmId         UUID de la finca (bytes32)
     * @param payloadHash    keccak256 del JSON canónico de milk_records
     * @param fatPct100      Grasa promedio × 100 (e.g. 320 = 3.20%)
     * @param proteinPct100  Proteína promedio × 100
     * @param sccThousands   SCC promedio en miles de células/mL
     * @param totalLiters    Total de litros producidos en el período
     * @param periodStart    Unix timestamp inicio del período
     * @param periodEnd      Unix timestamp fin del período
     */
    function certify(
        bytes32 certId,
        bytes32 farmId,
        bytes32 payloadHash,
        uint32  fatPct100,
        uint32  proteinPct100,
        uint32  sccThousands,
        uint32  totalLiters,
        uint64  periodStart,
        uint64  periodEnd
    ) external onlyOwner {
        if (_certs[certId].timestamp != 0) revert AlreadyCertified(certId);
        if (payloadHash == bytes32(0))     revert InvalidPayloadHash();
        if (periodEnd <= periodStart)      revert InvalidPeriod();

        // ── Lógica COVENIN 903 on-chain ───────────────────────────────────────
        // fatPct100 == 0 significa sin datos — no penaliza
        bool fatOk     = fatPct100     == 0 || fatPct100     >= 320;  // ≥ 3.20%
        bool proteinOk = proteinPct100 == 0 || proteinPct100 >= 280;  // ≥ 2.80%
        bool sccOk     = sccThousands  == 0 || sccThousands  <= 400;  // ≤ 400k

        QualityGrade grade;
        if (fatOk && proteinOk && sccOk) {
            grade = QualityGrade.A;
        } else if (sccOk) {
            grade = QualityGrade.B;
        } else {
            grade = QualityGrade.C;
        }
        // ─────────────────────────────────────────────────────────────────────

        uint64 ts = uint64(block.timestamp);

        _certs[certId] = QualityCert({
            certId:        certId,
            farmId:        farmId,
            payloadHash:   payloadHash,
            grade:         grade,
            fatPct100:     fatPct100,
            proteinPct100: proteinPct100,
            sccThousands:  sccThousands,
            totalLiters:   totalLiters,
            periodStart:   periodStart,
            periodEnd:     periodEnd,
            certifiedBy:   msg.sender,
            timestamp:     ts
        });
        _certIds.push(certId);

        emit MilkQualityCertified(
            certId,
            farmId,
            payloadHash,
            grade,
            fatPct100,
            proteinPct100,
            sccThousands,
            totalLiters,
            periodStart,
            periodEnd,
            msg.sender,
            ts
        );
    }

    // ─── Lectura ──────────────────────────────────────────────────────────────

    function getCert(bytes32 certId) external view returns (QualityCert memory) {
        return _certs[certId];
    }

    function verify(bytes32 certId, bytes32 payloadHash) external view returns (bool) {
        return _certs[certId].payloadHash == payloadHash
            && _certs[certId].timestamp != 0;
    }

    function totalCerts() external view returns (uint256) {
        return _certIds.length;
    }

    function getCertIds(uint256 offset, uint256 limit)
        external
        view
        returns (bytes32[] memory)
    {
        uint256 end = offset + limit;
        if (end > _certIds.length) end = _certIds.length;
        bytes32[] memory page = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            page[i - offset] = _certIds[i];
        }
        return page;
    }
}
