"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Calendar,
  Clock,
  ArrowLeft,
  Share2,
  Heart,
  MessageCircle,
  Zap,
  Shield,
  Database,
  TrendingUp,
  Users,
} from "lucide-react";

const articles: Record<
  string,
  {
    title: string;
    excerpt: string;
    content: string;
    category: string;
    categoryColor: string;
    date: string;
    readTime: string;
    author: string;
    authorRole: string;
    tags: string[];
    related: string[];
  }
> = {
  "blockchain-ganaderia-futuro": {
    title: "Por qué la blockchain es el futuro de la ganadería",
    excerpt:
      "Descubre cómo la tecnología blockchain está transformando la trazabilidad ganadera y por qué los compradores internacionales exigen certificados digitales.",
    category: "Tecnología",
    categoryColor: "primary",
    date: "10 abril 2026",
    readTime: "5 min",
    author: "Carlos Méndez",
    authorRole: "CEO & Fundador",
    tags: ["Blockchain", "Trazabilidad", "Tecnología"],
    related: ["rfid-ganaderia", "smart-contracts-ganaderia", "trazabilidad-aumenta-valor"],
    content: `
La tecnología blockchain llegó para transformar la industria ganadera. Y no es exageración: cada día más ranchers, compradores y reguladores exigen certificados digitales que solo la blockchain puede ofrecer.

## ¿Qué hace special a la blockchain?

A diferencia de una base de datos tradicional, la blockchain es un libro mayor distribuido e inmutable. Esto significa que una vez que un registro se escribe, no puede ser modificado o borrado. Nadie, ni siquiera nosotros como plataforma, podemos cambiar los datos.

### Inmutabilidad = Confianza

Cuandoun comprador obtiene un certificado de trazabilidad de Finca El Progreso, puede verificar que:
- El animal nació en la fecha registrada
- Recibió las vacunas declaradas
- Su historial de peso es real
- Nunca fue reportado como robado

Todo esto cryptográficamente firmado y verificable en segundos.

## Por qué los compradores internacionales la exigen

Cada vez más países y compradores requieren certificación de trazabilidad. El certificado blockchain:
- Se verifica instantly sin necesidad de intermediarios
- Es imposible de falsificar
- Cumple con estándares internacionales

Los ranchers que ya usan nuestra plataforma reportan un aumento del 15% en el valor de venta porque pueden ofrecer esta garantía.
    `,
  },
  "registro-animales-app": {
    title: "Cómo registrar tu ganado en 3 pasos con la app móvil",
    excerpt:
      "Una guía práctica para registrar animales usando tu teléfono móvil. Escanea aretes RFID o ingresa datos manualmente.",
    category: "Tutorial",
    categoryColor: "secondary",
    date: "8 abril 2026",
    readTime: "4 min",
    author: "María Rodríguez",
    authorRole: "CTO",
    tags: ["Tutorial", "App", "Guía"],
    related: ["rfid-ganaderia", "blockchain-ganaderia-futuro"],
    content: `
Registrar tu ganado nunca había sido tan fácil. Con nuestra app móvil puedes hacerlo en solo 3 pasos, incluso sin conexión a internet.

## Paso 1: Abre la app

Desde tu panel principal, toca el botón "+" para agregar un nuevo animal.

## Paso 2: Escanea o ingresa

### Opción A: Escaneo RFID
Simplemente apunta la cámara al arete RFID del animal. La app automáticamente:
- Lee el número de identificación
- Lo vincula a tu cuenta
- Busca si ya existe información previa

### Opción B: Ingreso manual
Si no tienes aretes RFID, ingresa:
- Número de arete (o genera uno)
- Especie (bovino, ovino, etc.)
- Raza
- Fecha de nacimiento aproximada
- Sexo

## Paso 3: ¡Listo!

El animal queda registrado en la blockchain. Cada registro incluye:
- Timestamp inmutable
- Geolocalización (opcional)
- Foto del animal (recomendado)

Puedes agregar más detalles cuando quieras: vacunas, tratamientos, pesos, etc.
    `,
  },
  "trazabilidad-aumenta-valor": {
    title: "Cómo la trazabilidad aumenta el valor de tu ganado",
    excerpt:
      "Estudios demuestras que animales con registro blockchain se venden hasta 15% más caro. Conoce los datos.",
    category: "Negocios",
    categoryColor: "accent",
    date: "5 abril 2026",
    readTime: "6 min",
    author: "José Torres",
    authorRole: "Director de Operaciones",
    tags: ["Negocios", "Economía", "Valor"],
    related: ["blockchain-ganaderia-futuro", "normativa-exportacion-ganado"],
    content: `
No es teoría: los datos confirman que la trazabilidad aumenta el valor de venta del ganado.

## El estudio

Analizamos más de 500 transacciones en nuestra plataforma durante los últimos 6 meses. Los resultados:

### Ganado con trazabilidad blockchain
- Precio promedio: $1.15/kg
- Tiempo en mercado: 12 días

### Ganado sin trazabilidad  
- Precio promedio: $1.00/kg
- Tiempo en mercado: 21 días

La diferencia: **15% más por kilogramo**.

## ¿Por qué pagarán más?

Los compradores saben que:
- El animal es quien dice ser
- Las vacunas son reales
- El peso es verificable
- No hay fraude de intermediarios

Además, pueden revender con el mismo certificado, aumentando el valor para el siguiente comprador.

## El caso del mercado internacional

Para exportaciones, el incremento es aún mayor:
- Colombia: 20-25% sobre precio local
- Mercado comunitario andino: hasta 30%

El certificado blockchain elimina la necesidad de intermediarios de certificación, reduciendo costos y aumentando ganancias.
    `,
  },
  "normativa-exportacion-ganado": {
    title: "Requisitos para exportar ganado a Colombia y países andinos",
    excerpt:
      "Todo lo que necesitas saber sobre certificados de trazabilidad y requisitos legales para exportar tu ganado.",
    category: "Legal",
    categoryColor: "primary",
    date: "3 abril 2026",
    readTime: "8 min",
    author: "Carlos Méndez",
    authorRole: "CEO & Fundador",
    tags: ["Legal", "Exportación", "Normativa"],
    related: ["trazabilidad-aumenta-valor", "blockchain-ganaderia-futuro"],
    content: `
Exportar ganado a países andinos requiere cumplir con normativas específicas. Te guiaremos por los requisitos.

## Requisitos generales

### Documentación básica
1. Certificado de origen y trazabilidad
2. Registro sanitario vigente
3. Guía de movilización
4. Factura de venta

### Certificado Finca El Progreso

Nuestro certificado digital incluye:
- Identificación del animal (arete RFID)
- Historial de vaccinations
- Tratamientos realizados
- Peso verificado
- Certificado de nacimiento

Este certificado es reconocido por autoridades de:
- Colombia (ICA)
- Ecuador (AGROCALIDAD)
- Perú (SENASA)

## Proceso paso a paso

### 1. Prepara la documentación
Genera el certificado desde tu panel. Todos los datos quedan registrados en blockchain.

### 2. Solicita inspección
Contacta al servicio sanitario local para inspección pre-exportación.

### 3. Obtén el certificado
Con notre certificación blockchain, el proceso es más rápido.

### 4. Transporte
Cuenta con guía de movilización vigente.

## Consejos

- Haz el proceso con tiempo (mínimo 15 días antes)
- Asegúrate que los aretes RFID estén correctamente instalados
- Todos los animales deben tener historial completo

¿Necesitas ayuda específica? Contáctanos.
    `,
  },
  "rfid-ganaderia": {
    title: "Todo sobre aretes RFID para ganado",
    excerpt:
      "Guía completa sobre los tipos de aretes RFID, lectores compatibles y cómo integrarlos con tu sistema de gestión.",
    category: "Tecnología",
    categoryColor: "secondary",
    date: "1 abril 2026",
    readTime: "7 min",
    author: "María Rodríguez",
    authorRole: "CTO",
    tags: ["RFID", "Tecnología", "Hardware"],
    related: ["registro-animales-app", "blockchain-ganaderia-futuro"],
    content: `
Los aretes RFID son esenciales para la trazabilidad moderna. Te explicamos todo lo que necesitas saber.

## ¿Qué es RFID?

RFID significa "Radio Frequency Identification". Básicamente, es un chip kecilano que transmite su número único cuando un lector se acerca.

## Tipos de aretes RFID

### LF (Low Frequency) - 125kHz
- Alcance: 10-30 cm
- Ventaja: Funciona bien cerca del agua
- Desventaja: Necesitas acercar el lector

### HF (High Frequency) - 13.56MHz
- Alcance: 5-15 cm
- Mejor para lectura múltiple
- Más económico

### UHF (Ultra High Frequency) - 860-960MHz
- Alcance: hasta 10 metros
- Ideal para ganado en corrales
- Precio más elevado

## Nuestra recomendación

Para la mayoría de ranchers, LF o HF funcionan bien. Puedes usar tu teléfono móvil con un lector externo conectado por Bluetooth.

## Lectores compatibles

Trabajamos con los principales lectores del mercado:
-ZL-RFID200 (Bluetooth, batería 12h)
- Nordic ID (resistente al agua)
- cualquier lector USB/Bluetooth con serie virtual

## Integración con Finca El Progreso

Al escanear, la app automáticamente:
1. Lee el número del arete
2. Busca en tu base de datos
3. Muestra el perfil del animal
4. Permite agregar nuevo registro
    `,
  },
  "smart-contracts-ganaderia": {
    title: "Smart contracts: automatiza ventas de金龙",
    excerpt:
      "Cómo usar contratos inteligentes para automatizar pagos y transferencias de propiedad al vender tu ganado.",
    category: "Tecnología",
    categoryColor: "accent",
    date: "28 marzo 2026",
    readTime: "6 min",
    author: "María Rodríguez",
    authorRole: "CTO",
    tags: ["Smart Contracts", "Blockchain", "Automatización"],
    related: ["blockchain-ganaderia-futuro", "trazabilidad-aumenta-valor"],
    content: `
Los smart contracts o contratos inteligentes están revolucionando las ventas de ganado. Descubre cómo usarlos.

## ¿Qué es un smart contract?

Es un programa que se ejecuta automáticamente cuando se cumplen ciertas condiciones. En ventas de ganado, puede:

- Liberar pago automaticamente cuando el comprador recibe el animal
- Transferir el certificado de propiedad
- Notificar a todas las partes

## Beneficios

### Para el vendedor
- Pago garantizado al entregar
- No hay riesgo de fraude
- Pago instantáneo

### Para el comprador
- Recibe el animal antes de pagar
- Certificado se transfiere automáticamente
- Historial completo disponible

## Cómo usarlo en Finca El Progreso

### 1. Crea el contrato
Desde tu panel, selecciona "Venta con Smart Contract":
- Define el precio
- Selecciona el animal(es)
- Establece condiciones (ej: entrega en X días)

### 2. Comparte el contrato
Envía el enlace al comprador. Puede revisar:
- Historial completo del animal
- Certificado blockchain
- Condiciones de venta

### 3. Ejecución
Cuando el comprador confirma y cumple las condiciones:
- El pago se libera automáticamente
- El certificado se transfiere a su cuenta
- Ambos reciben confirmación

## El futuro

Pronto podrás usar pagos en criptomonedas stablecoins, permitiendo transacciones internacionales instantáneas.
    `,
  },

  // CUIDADO DEL GANADO
  "vacunas-ganado-calendario": {
    title: "Calendario de vaccinations para ganado bovino",
    excerpt:
      "Todo lo que necesitas saber sobre las vacunas esenciales, fechas y protocolos para mantener tu hato saludable.",
    category: "Cuidado",
    categoryColor: "primary",
    date: "11 abril 2026",
    readTime: "8 min",
    author: "José Torres",
    authorRole: "Director de Operaciones",
    tags: ["Vacunas", "Salud", "Cuidado"],
    related: ["antencion-parto", "nutricion-ganado", "parasitos-ganado"],
    content: `
Un calendario de vacunación adecuado es fundamental para la salud de tu hato y para cumplir con los requisitos de trazabilidad.

## Vacunas esenciales

### Fiebre Aftosa
La vacunación contra fiebre aftosa es obligatoria en Venezuela y la mayoría de países.
- Primera dosis: a los 4 meses de edad
- Refuerzo: cada 6 meses
- Importante: registra cada aplicación en el sistema

### Carbón Bacteriano
Protege contra el ántrax煤气. Es obligatoria en zonas endémicas.
- Dosis única a los 3-4 meses
- Refuerzo anual en zonas de riesgo

### Rabia
Obligatoria en zonas donde existe la enfermedad.
- Primera dose a los 3 meses
- Refuerzo anual

### Brucelosis
Esta Vaccine es obligatori para animales mayores de 8 meses.
- Una sola dosis
- Solo hembras
- Requiere veterinario certificados

### Clostridiosis (Cuádruple)
Protege contra varias enfermedades clostridiales.
- A los 2-3 meses
- Refuerzo a los 6 meses
- Refuerzos anuales

## Cómo registrar las vacunas

En Finca El Progreso, cada vacunación queda registrada con:
- Fecha de aplicación
- Lote de la vacuna
- Veterinario responsable
- Número de arete del animal

Esto genera un certificado inmutable que puedes mostrar a compradores o autoridades.

## Calendario sugerido

| Edad | Vacuna |
|------|-------|
| 2-3 meses | Clostridiosis |
| 3 meses | Rabia |
| 4 meses | Fiebre Aftosa |
| 6 meses | Refuerzo Fiebre Aftosa |
| 8 meses | Brucelosis (hembras) |
| 12 meses | Refuerzo anual general |

Siempre consulta con tu veterinario para ajustar el calendario a tu zona y tipo de explotación.
    `,
  },

  "nutricion-ganado": {
    title: "Guía de nutrición para ganado bovino",
    excerpt:
      "Aprende sobre los requerimientos nutricionales, tipos de alimentos y cómo optimizar la alimentación de tu hato.",
    category: "Cuidado",
    categoryColor: "secondary",
    date: "9 abril 2026",
    readTime: "10 min",
    author: "José Torres",
    authorRole: "Director de Operaciones",
    tags: ["Nutrición", "Alimentación", "Cuidado"],
    related: ["vacunas-ganado-calendario", "manejo-pasto", "suplementacion-ganado"],
    content: `
La nutrición adecuada es la base de una ganadería rentable. Una buena alimentación mejora el crecimiento, la producción de leche y la reproducción.

## Requerimientos nutricionales por etapa

### Terneros (0-6 meses)
Los terneros necesitan leche materna los primeros meses, pero pueden empezar a consumir pasto a los 2-3 meses.
- Leche: 8-10% del peso corporal diario
- Introducir pasto de buena calidad a los 2 meses
- Agua limpia siempre disponible

### Animales en crecimiento (6-24 meses)
Esta etapa requiere atención especial para un desarrollo óptimo.
- Pasto de calidad: 2.5-3% del peso corporal
- Proteína: 12-14% de la dieta
- Minerales: sal mineralizada siempre disponible

### Animales adultos
Los requerimientos varían según el estado fisiológico.
- Mantenimiento: 2% del peso en materia seca
- Gestación: aumentar 20% en últimos 2 meses
- Lactación: aumentar hasta 50%

## Tipos de alimentos

### Pastos
El pasto es la base de la alimentación en sistemas tropicales.
- gramíneas: Guinea, Estrella, Brachiaria
- Leguminosas: Kudzú, glycine, Stylosanthes
- Ventaja: bajo costo
- Desventaja:varía en calidad según estación

### Concentrados
Son ricos en energía y proteína.
--maíz, sorgo, cebada
- Tortas: soja, girasol, palmiste
- Usar en suplementación estratégica

### Minerales
Essenciales para el metabolismo.
- Sal común: sodio y cloro
- Minerals mix: calcio, fósforo, zinc, cobre, selenio
- Siempre disponible en area de descanso

## Errores comunes en nutrición

### Sobrealimentación con concentrados
 puede causar acidosis ruminal.
- Introducir gradualmente
- Máximo 1% del peso corporal
- Distribuir en 2-3 tomas diarias

### Falta de agua limpia
El agua es el nutriente más importante.
-确保 agua limpia siempre
- 5-10% del peso corporal diario
- reducer en épocas frías

### Ignorar la calidad del pasto
El pasto varíanutritivo según:
- Época del año
- Tipo de suelo
- Estado de madurez

## Consejos prácticos

1. **Pastoreo rotativo**: Permite recuperación del pasto y mejor aprovechamiento
2. **Suplementación en época seca**: Cuando el pasto pierde calidad
3. **Mineralización**: Especialmente en animales en crecimiento y hembras preñadas
4. ** pesode regularly**: Para ajustar la alimentación
    `,
  },

  "antencion-parto": {
    title: "Atención al parto en ganado bovino",
    excerpt:
      "Guía completa para asistir el parto, cuidar al ternero recién nacido y prevenir complicaciones.",
    category: "Cuidado",
    categoryColor: "accent",
    date: "7 abril 2026",
    readTime: "7 min",
    author: "José Torres",
    authorRole: "Director de Operaciones",
    tags: ["Parto", "Reproducción", "Cuidado"],
    related: ["vacunas-ganado-calendario", "nutricion-ganado", "manejo-pasto"],
    content: `
El parto es un momento crítico que requiere atención y preparación adecuada. Una buena atención al parto asegura un ternero saludable y una recuperación rápida de la madre.

## Señales de parto próximo

### Cambios físicos (1-2 semanas antes)
- Ubicación de la vulva se hincha
- Secreción mucosa espesa
- Ubicación y relajación de ligamentos pélvicos
- Ubicación de la ubre (úlcera)

### Cambios de comportamiento (24-48 horas antes)
- Inquietud, se aísla del grupo
- Busca lugar aislado
- Se echa y se levanta frecuentemente
- Puede babear o gemir

### Etapas del parto

#### Primera etapa: Dilatación (2-12 horas)
- Contracciones uterinas suaves
- La vaca se muestra incómoda
- Se rompe la fuente de agua (si no, ayudar)

#### Segunda etapa: Expulsión (30 minutos-4 horas)
- Contracciones fuertes y frecuentes
- Se observan las membranas (bolsa agua)
- El ternero avanza por el canal de parto
- Mayor esfuerzo de la madre

#### Tercera etapa: Salida de la placenta (2-12 horas)
- normal que tome varias horas
- Si pasa 24 horas, consultar veterinario

## Asistencia al parto

### Cuándo intervenir

- Parto no progresa después de 2 horas de contracciones activas
- El ternero no avanza apesar de esfuerzo
- Presentación anormal (deberes patas primero, etc.)
- La madre muestra agotamiento

### Cómo ayudar

1. **Lávate bien las manos** y brazo
2. Usa guantes limpios
3. No tires del ternero bruscamente
4. guía las patas anteriores del ternero
5. Si es necesario, usa lubricante

**Importante**: Si no estás seguro, llama al veterinario.

## Cuidado del ternero recién nacido

### Primeros minutos

1. **Limpiar las vías respiratorias**: Mocos y líquido amniótico
2. **estimular la respiración**: Frotar suavemente o mover
3. **Asegurar que succione**: Ayudarlo a encontrar la ubre
4. **Identificar**: Registrar arete/RFID lo antes posible

### Primeras 24 horas

- Consume calostro en las primeras 6 horas
- El calostro proporciona defensas (anticuerpos)
-esteros débiles o huérfanos: alimentar con biberón
- Mantener en área limpia y seca

## Complicaciones a revisar

- Retención de placenta (más de 12 horas)
- Hemorragia post-parto
- Infección uterina (fiebre, flujo maloliente)
- Mastitis (inflamación de la ubre)

Ante cualquier anomalía, consultar al veterinario.
    `,
  },

  "parasitos-ganado": {
    title: "Control de parásitos en ganado bovino",
    excerpt:
      "Aprende a identificar, prevenir y tratar las principales parasitosis que afectan al ganado.",
    category: "Cuidado",
    categoryColor: "primary",
    date: "6 abril 2026",
    readTime: "8 min",
    author: "José Torres",
    authorRole: "Director de Operaciones",
    tags: ["Parásitos", "Desparasitación", "Cuidado"],
    related: ["vacunas-ganado-calendario", "nutricion-ganado", "manejo-pasto"],
    content: `
Los паразиты internos y externos representan una amenaza significativa para la salud y productividad del ganado. Un control adecuado es esencial.

## Parásitos internos (Gusanos)

### Tipos principales

#### Garrapatas
- Transmiten enfermedades como anaplasmosis y babesiosis
- Se adhieren a la piel, especialmente en zona de ubre, cola y axilas
- Control: baños garrapaticidas, aplicadores pour-on

#### Lombrices intestinales
- Afectan elintestino Causan anemia, diarrea y perda de peso
- Síntomas: pelaje-opaco, debilidad, edema (hinchazón)
- диагностика: examen de heces

#### Strongylideos
- Los más conmemunes
- Causan daño alintestino y menor absorción de nutrientes
-预防: rotación de potreros

### Programa de desparasitación

| Edad | Acción |
|-----|--------|
| 2 meses | Primera desparasitación |
| 4 meses | Segunda dosis |
| Cada 3-6 meses | Adults, según riesgo |

## Parásitos externos

### Garrapatas (ya mencionadas)
Tratamiento:
- Baños garrapaticidas cada 21-30 días
- Aplicadores pour-on
- Control del pasto

### Mosca de los cuernos
- Causa estrés y reduce alimentación
- Tratamiento: insecticidas, repelentes
- Control ambiental

### Piojos
- Mãs común en invierno
- Prodicess prurito intenso y pérdida de pelo
- Tratamiento: baños insecticidas

## Síntomas de infestación

- Pelaje opaco y desatado
- Debilidad y bajo rendimiento
- Pérdida de apetito
- Diarrea o estreñimiento
- Anemia (encías pálidas)
- Retraso en crecimiento

## medidas preventivas

1. **Rotación de potreros**: Reduce exposición a larvas
2. **Manejo apropiado del pasto**: Cortar regularmente
3. **Desparasitación programada**: No esperar a síntomas
4. **Cuarentena**: Nuevos animales siempre
5. **Mantenimiento de instalaciones**: Limpio y seco

## Importante

- Consultar al veterinario para diseñar un programa adecuado
- Los antiparasitários deben rotarse para evitar resistencia
- Registrar todas las aplicaciones en el sistema de trazabilidad
    `,
  },

  "manejo-pasto": {
    title: "Manejo integrado del pasto para ganadería",
    excerpt:
      "Técnicas de manejo del pasto para maximizar la producción forrajera y la capacidad de carga.",
    category: "Cuidado",
    categoryColor: "secondary",
    date: "4 abril 2026",
    readTime: "9 min",
    author: "José Torres",
    authorRole: "Director de Operaciones",
    tags: ["Pasto", "Forraje", "Manejo"],
    related: ["nutricion-ganado", "parasitos-ganado", "suplementacion-ganado"],
    content: `
El pasto es la base alimenticia más económica para la ganadería tropical. Un buen manejo del pasto aumenta la producción de carne y leche.

## Principios del manejo del pasto

### Conceptos básicos

- ** Capacidad de carga**: Número de animales por área
- **Tiempo de reposo**: Tiempo para que el pasto se recupere
- **Tiempo de ocupación**: Tiempo que los animales están en cada potrero
- **Utilización**: Porcentaje del pasto que realmente se consume

### El ciclo del pasto

1. **Pasto crece** → 2. **Animal pasta** → 3. **Pasto descansa y recupera**

Cortar muy cortas o sobrepastoreo debilita las plantas.

## Sistemas de pastoreo

### Pastoreo rotativo
El más recomendado. Consiste en dividir el área en potreros yrotarlos.
- Beneficios: mejor recuperación del pasto, mejor distribución del estiércol
- Desventaja: requiere más inversión inicial en cercas

**Recomendación**: 5-7 potreros mínimo, rotación cada 7-14 días

### Pastoreo continuo
El animal permanece siempre en el mismo potrero.
- Ventaja: bajo costo
- Desventaja: menor producción, mayor compactación del suelo

### Pastoreo en franjas
移动 cercas eléctricas para definir áreas pequeñas.
- muy eficiente para alta producción
- Requiere manejo daily

## Especies forrareas推荐adas

### Gramíneas
- **Brachiaria** (B. brizantha, B. decumbens): Muy productiva, tolera sombra parcial
- **Estrella** (Cynodon nlemfuensis): Alta producción, tolerante al pisoteo
- **Guinea** (Panicum maximum): Excelente calidad, necesita buen suelo
- **Angola** (Paspalum atratum): Tolera suelos húmedos

### Leguminosas
- **Kudzú** (Pueraria phaseoloides): Fija nitrógeno, trepadora
- **Glycine** (Neonotonia wightii):很好en mezcla
- **Stylosanthes** (S. guianensis): Tolera suelos pobres

## Mejora de potreros

### Fertilización
- Nitrógeno: aumenta crecimiento, pero ayuda solo al pasto
- Fósforo: mejora calidad, essential para leguminosas
- Análisis de suelo para determinar necesidades

### weed control
- Mantener el pasto vigoroso competitiva
- Aplicar herbicidas selectivos si es necesario
- Evitar que las malezas semillen

### Resiembra
- En áreas degradeadas, reincorporar semilla de calidad
- Preparar suelo superficialmente
- Consolage após rainy season

## Consejos prácticos

1. **No sobrepastorear**: Dejar al menos 10-15 cm de pasto
2. **Rotar potreros**: Permite recuperación uniforme
3. **Combinar especies**: Gramíneas + leguminosas
4. **Monitorear crecimiento**: Medir producción regularmente
5. **Ajustar carga**: Según disponibilidad de pasto

    `,
  },

  "suplementacion-ganado": {
    title: "Suplementación estratégica en época seca",
    excerpt:
      "Aprende a planificar la suplementación para mantener la productividad durante la época seca.",
    category: "Cuidado",
    categoryColor: "accent",
    date: "2 abril 2026",
    readTime: "6 min",
    author: "José Torres",
    authorRole: "Director de Operaciones",
    tags: ["Suplementación", "Época seca", "Alimentación"],
    related: ["nutricion-ganado", "manejo-pasto", "parasitos-ganado"],
    content: `
La época seca representa un desafío para la ganadería. El pasto pierde calidad y cantidad, lo que afecta el rendimiento del ganado. Una buena suplementación es clave para mantener la productividad.

## Por qué suplementar en época seca

### Cambios en el pasto

- Menor contenido de proteína (baja de 12% a 4-6%)
- Mayor contenido de fibra (menor digestibilidad)
- Menor disponibilidad (crecimiento lento)
- Pérdida de hojas secas

### Efectos en el animal

- Reducción en consumo de materia seca
- Menor ganancia de peso o perdapeso
- Menor producción de leche
- Mayor susceptibilidad a enfermedades

## Estrategias de suplementación

### Suplementación proteica
Necesaria cuando el pasto tiene meno proteinay aporta nitrógeno para la fermentación ruminal.

- **Torta de soja**: 20-45% de proteína
- **Torta de girasol**: 30-40% de proteína
- **Torta de palmiste**: 18-22% de proteína

**Dosis sugerida**: 0.5-1.5 kg/animal/día según producción

### Suplementación energética
Aporta energía inmediata, útil para animales en producción.

- **Maíz molido**: Alta energía
- **Sorgo**: Más económico
- **Melaza**: Además aporta minerales

**Dosis sugerida**: 1-3 kg/animal/día

### Suplementación mineral
Essencial durante toda la época, especialmente en seca.

- **Mezcla mineral completa**: Siempre disponible
- **Block multinutricional**: licke licks
- **Agua salada**: Sodium y cloro

## Planificando la suplementación

### Antes de la seca

1. **Evalúa tu inventario**: Cantidad de animales y categorías
2. **Calcula necesidades**: Según meta productiva
3. **Programa compras**: Adquirir suplementos con anticipación
4. **Prepara instalaciones**: Lugares de suplementación

### Durante la seca

- Iniciar supplementation gradualmente
- Ajustar según condición corporal
-分组 animales por requerimientos
- Monitorear peso regularmente

## Errores a evitar

- **Comenzar muy tarde**: Esperar a que bajen de condición
- **Suplementar solo energía**: Sin proteína no hay fermentación
- **No darle tiempo de adaptarse**: Cambiosgraduales (7-10 días)
- **No proporcionar agua**: Necesaria para la suplementación

## Alternativas forrajeras

Considera establecer:

- **Caña de azúcar**: Alta producción de biomasa
- **Leucaena**: Leguminosa tolerante a seca
- **Morera**: Hojas altamente nutritivas
- **Silo**: Reservas para época crítica

    `,
  },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function BlogPostPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const slug = resolvedParams?.slug || "blockchain-ganaderia-futuro";
  const article = articles[slug] || articles["blockchain-ganaderia-futuro"];

  const relatedArticles = article.related
    .map((relatedSlug) => articles[relatedSlug])
    .filter(Boolean);

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <article>
          <section className="relative overflow-hidden py-16 md:py-24">
            <div className="absolute inset-0 z-0">
              <Image src="/home/hero-home.png" alt="" fill priority className="object-cover" />
              <div className="from-background/80 via-background/60 to-background/90 absolute inset-0 bg-gradient-to-b" />
            </div>

            <div className="relative z-10 container mx-auto px-4">
              <Link
                href="/blog"
                className="text-primary mb-8 inline-flex items-center gap-2 text-sm font-medium hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al Blog
              </Link>

              <div className="mx-auto max-w-4xl">
                <div className="mb-6 flex items-center gap-4">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      article.categoryColor === "primary"
                        ? "bg-primary/10 text-primary"
                        : article.categoryColor === "secondary"
                          ? "bg-secondary/10 text-secondary"
                          : "bg-accent/10 text-accent"
                    }`}
                  >
                    {article.category}
                  </span>
                  <span className="text-foreground/60 text-sm">{article.readTime} de lectura</span>
                </div>

                <h1 className="text-foreground mb-6 text-4xl font-bold md:text-5xl">
                  {article.title}
                </h1>

                <p className="text-foreground/70 mb-8 text-xl">{article.excerpt}</p>

                <div className="border-border flex flex-wrap items-center gap-6 border-b pb-8">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                      <Users className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-card-foreground font-medium">{article.author}</div>
                      <div className="text-foreground/60 text-sm">{article.authorRole}</div>
                    </div>
                  </div>
                  <div className="text-foreground/60 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {article.date}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="container mx-auto px-4 py-16">
            <div className="mx-auto max-w-3xl">
              <div className="prose prose-lg dark:prose-invert max-w-none">
                {article.content.split("\n\n").map((paragraph, i) => {
                  if (paragraph.startsWith("## ")) {
                    return (
                      <h2 key={i} className="text-foreground mt-12 mb-6 text-2xl font-bold">
                        {paragraph.replace("## ", "")}
                      </h2>
                    );
                  }
                  if (paragraph.startsWith("### ")) {
                    return (
                      <h3 key={i} className="text-foreground mt-8 mb-4 text-xl font-semibold">
                        {paragraph.replace("### ", "")}
                      </h3>
                    );
                  }
                  if (paragraph.startsWith("- ")) {
                    return (
                      <ul key={i} className="text-foreground/70 mb-4 list-disc pl-6">
                        <li>{paragraph.replace("- ", "")}</li>
                      </ul>
                    );
                  }
                  if (paragraph.match(/^\d\. /)) {
                    return (
                      <ol key={i} className="text-foreground/70 mb-4 list-decimal pl-6">
                        <li>{paragraph.replace(/^\d\. /, "")}</li>
                      </ol>
                    );
                  }
                  if (paragraph.match(/^[*|-] /)) {
                    return (
                      <li key={i} className="text-foreground/70 mb-2">
                        {paragraph.replace(/^[*|-] /, "")}
                      </li>
                    );
                  }
                  return (
                    <p key={i} className="text-foreground/70 mb-6 leading-relaxed">
                      {paragraph}
                    </p>
                  );
                })}
              </div>

              <div className="mt-12 flex flex-wrap gap-2">
                {article.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="bg-muted text-foreground/70 rounded-full px-4 py-2 text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="border-border mt-12 flex items-center gap-4 border-t pt-8">
                <button className="text-primary-foreground bg-primary hover:bg-primary/90 flex items-center gap-2 rounded-full px-6 py-2.5 font-medium transition-colors">
                  <Heart className="h-5 w-5" />
                  Me gusta
                </button>
                <button className="border-border text-foreground hover:bg-muted flex items-center gap-2 rounded-full border-2 px-6 py-2.5 font-medium transition-colors">
                  <Share2 className="h-5 w-5" />
                  Compartir
                </button>
              </div>
            </div>
          </section>

          {relatedArticles.length > 0 && (
            <section className="bg-muted py-16">
              <div className="container mx-auto px-4">
                <h2 className="text-foreground mb-8 text-2xl font-bold">Artículos Relacionados</h2>
                <div className="grid gap-6 md:grid-cols-3">
                  {relatedArticles.map((related, i) => (
                    <Link
                      key={i}
                      href={`/blog/${article.related[i]}`}
                      className="group bg-card border-border hover:border-primary/40 overflow-hidden rounded-xl border p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
                    >
                      <span
                        className={`mb-3 inline-block rounded-full px-2 py-1 text-xs font-medium ${
                          related.categoryColor === "primary"
                            ? "bg-primary/10 text-primary"
                            : related.categoryColor === "secondary"
                              ? "bg-secondary/10 text-secondary"
                              : "bg-accent/10 text-accent"
                        }`}
                      >
                        {related.category}
                      </span>
                      <h3 className="text-card-foreground group-hover:text-primary mb-2 font-bold transition-colors">
                        {related.title}
                      </h3>
                      <p className="text-foreground/60 line-clamp-2 text-sm">{related.excerpt}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
        </article>

        <section className="relative overflow-hidden py-20">
          <div className="absolute inset-0">
            <Image src="/home/cta.png" alt="" fill className="object-cover" />
            <div className="from-primary/90 via-primary/70 to-primary/90 absolute inset-0 bg-gradient-to-r" />
          </div>

          <div className="relative container mx-auto px-4">
            <div className="mx-auto max-w-3xl rounded-3xl bg-white/10 p-8 text-center backdrop-blur-md md:p-16">
              <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">¿Tienes preguntas?</h2>
              <p className="mb-10 text-xl text-white/90">
                Contáctanos y te ayudamos con lo que necesites
              </p>
              <Link
                href="/contacto"
                className="text-primary hover:shadow-3xl relative inline-block overflow-hidden rounded-2xl bg-white px-10 py-5 text-xl font-bold shadow-2xl transition-all hover:scale-105"
              >
                Contactar
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
