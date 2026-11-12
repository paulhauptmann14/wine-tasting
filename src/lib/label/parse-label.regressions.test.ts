// Raw Tesseract output of real label photos (round-1 measurement): two of the owner's bottles and
// three Open Food Facts photos (CC BY-SA, world.openfoodfacts.org, products 8410537200422,
// 4400066903424, 4400066903714). Each case is a wrong value the first parser filled in.
import { describe, expect, it } from 'vitest'
import { parseLabel } from './parse-label'
import type { OcrLine } from './types'

const l = (text: string, confidence: number, x0: number, y0: number, x1: number, y1: number): OcrLine => ({
  text,
  confidence,
  bbox: { x0, y0, x1, y1 },
})

const parse = (lines: OcrLine[]) => parseLabel(lines, { currentYear: 2026 })

describe('round-1 failures on real OCR', () => {
  it('La Croix Belle: the cuvée is a name candidate, the domaine a producer candidate, no "Mis en …"', () => {
    const result = parse(laCroixBelle)
    expect(result.name).toBeUndefined()
    expect(result.winery).toBeUndefined()
    expect(result.nameCandidates?.[0]).toMatch(/^Camp del Ga[il]$/)
    expect(result.wineryCandidates?.map((w) => w.toLowerCase().replace(/\s/g, ''))).toContain('lacroixbelle')
    const all = [...(result.nameCandidates ?? []), ...(result.wineryCandidates ?? [])]
    expect(all.some((v) => /^mis\b/i.test(v))).toBe(false)
  })

  it('Innamorati: the cut-off "WEINBIE" is never filled in, the sweetness still is', () => {
    const result = parse(innamorati)
    expect(result.name).toBeUndefined()
    expect(result.winery).toBeUndefined()
    expect(result.sweetness).toEqual({ value: 'sweet', sure: true })
  })

  it('El Coto: no name from texture noise, "Crianza" is offered, vintage and type stay', () => {
    const result = parse(elCoto)
    expect(result.name).toBeUndefined()
    expect(result.nameCandidates).toContain('Crianza')
    expect(result.vintage?.value).toBe(2014)
    expect(result.wineType?.value).toBe('red')
    for (const noise of ['Git', 'Nel', 'Ven', 'Dei', 'Moi', 'Osa', 'Lee', 'Nos']) expect(result.nameCandidates ?? []).not.toContain(noise)
  })

  it('Rotkäppchen: "chel", "chi" and "ché" never appear', () => {
    for (const lines of [rotkaeppchenTrocken, rotkaeppchenMild]) {
      const result = parse(lines)
      expect(result.name).toBeUndefined()
      const all = [...(result.nameCandidates ?? []), ...(result.wineryCandidates ?? [])].map((v) => v.toLowerCase())
      for (const noise of ['chel', 'chi', 'ché', 'mpos']) expect(all).not.toContain(noise)
    }
    expect(parse(rotkaeppchenMild).wineType).toEqual({ value: 'sparkling', sure: true })
    expect(parse(rotkaeppchenTrocken).sweetness).toEqual({ value: 'dry', sure: true })
  })
})

const laCroixBelle: OcrLine[] = [
  l('LACROIX BELLE', 93, 188, 673, 1613, 820),
  l('CAMP DEL GAL', 90, 377, 927, 1329, 1037),
  l('CAMP DEL GAI', 94, 378, 929, 1279, 1027),
  l('MIS EN BOI', 58, 268, 1623, 620, 1705),
  l('MIS EN BOLTLILUE AU DOMAINE', 69, 269, 1626, 1498, 1737),
]

const innamorati: OcrLine[] = [
  l('INNAMORA', 89, 289, 88, 943, 188),
  l('RU CM', 47, 761, 186, 926, 255),
  l('SÜSS & FRUCHTIS :', 79, 366, 208, 1062, 270),
  l('QUIS', 48, 551, 298, 1071, 567),
  l('Ss', 43, 45, 307, 522, 675),
  l('m', 51, 1043, 741, 1093, 792),
  l('4 ta', 78, 744, 812, 868, 856),
  l('o', 43, 48, 1011, 372, 1100),
  l('De nen', 39, 718, 1124, 1076, 1190),
  l('lle. mei', 34, 503, 1303, 1088, 1361),
  l('te” —', 63, 45, 1313, 488, 1376),
  l('WEINBIE', 90, 377, 1404, 945, 1750),
  l('feat 7', 46, 62, 1630, 292, 1778),
  l('MANUFAKTUS TA', 62, 551, 1665, 1052, 1790),
  l('AKTUR', 86, 741, 1705, 903, 1754),
  l('n°', 68, 206, 1741, 251, 1782),
  l('YA', 67, 945, 1747, 1052, 1833),
  l('74', 65, 979, 1835, 1030, 1868),
  l('WE', 57, 63, 1838, 218, 1931),
  l('‘di', 78, 951, 1879, 1051, 1923),
]

const elCoto: OcrLine[] = [
  l('a', 53, 833, 8, 855, 18),
  l('rt', 37, 855, 35, 962, 76),
  l('Æ', 58, 713, 40, 732, 50),
  l('un ee', 31, 0, 80, 336, 165),
  l('git', 73, 735, 81, 754, 92),
  l('at', 57, 716, 92, 739, 99),
  l('ae', 49, 658, 156, 686, 166),
  l('re,', 57, 327, 211, 344, 220),
  l('a', 56, 939, 229, 952, 233),
  l('Ba', 35, 627, 236, 675, 250),
  l('we', 54, 527, 237, 558, 252),
  l('1', 46, 811, 268, 895, 289),
  l('«af', 69, 43, 304, 73, 317),
  l('parted', 31, 855, 324, 905, 335),
  l('wi.', 42, 130, 336, 156, 346),
  l('Se', 40, 666, 340, 689, 347),
  l('tr', 45, 460, 347, 481, 353),
  l('an', 46, 723, 356, 763, 368),
  l('E', 53, 650, 360, 690, 393),
  l('ee', 41, 850, 416, 939, 442),
  l('ZI', 64, 624, 466, 666, 482),
  l('FA,', 80, 633, 498, 669, 515),
  l('AA', 38, 240, 591, 308, 616),
  l('ve', 69, 78, 600, 100, 606),
  l('4', 56, 595, 600, 657, 698),
  l('ad', 41, 103, 604, 128, 612),
  l('é', 83, 677, 663, 692, 687),
  l('es', 33, 775, 684, 797, 690),
  l('3', 56, 677, 687, 697, 710),
  l('a', 41, 228, 730, 258, 737),
  l('ax', 34, 916, 737, 938, 746),
  l('gr TEE', 39, 325, 752, 475, 793),
  l('oo', 35, 225, 775, 251, 783),
  l('nel', 65, 612, 776, 634, 789),
  l('ur', 65, 143, 810, 166, 818),
  l('LR', 49, 455, 811, 492, 824),
  l('LA', 56, 546, 811, 569, 822),
  l('pus', 36, 15, 815, 65, 828),
  l('ra', 37, 443, 851, 475, 860),
  l('CR', 48, 570, 878, 588, 889),
  l('A', 50, 346, 885, 384, 904),
  l('ad', 49, 759, 887, 784, 894),
  l('Ven,', 80, 347, 894, 368, 903),
  l('vi', 76, 442, 897, 460, 908),
  l('Dei', 48, 356, 900, 386, 917),
  l('er', 45, 190, 907, 216, 912),
  l('SE', 83, 483, 913, 508, 935),
  l('er', 35, 852, 913, 891, 922),
  l('È', 45, 487, 936, 518, 956),
  l('ne', 49, 323, 945, 383, 954),
  l('fo', 57, 315, 946, 347, 954),
  l('Moi', 45, 376, 983, 427, 1006),
  l('COTO', 90, 436, 991, 623, 1082),
  l('um', 32, 135, 1002, 179, 1013),
  l('EL', 96, 350, 1008, 416, 1079),
  l('a', 41, 93, 1009, 134, 1017),
  l('Zen.', 68, 196, 1027, 257, 1039),
  l('BR', 54, 37, 1033, 73, 1042),
  l('se', 34, 53, 1050, 157, 1059),
  l('TE', 31, 210, 1071, 247, 1075),
  l('m', 53, 50, 1075, 102, 1085),
  l('CRIANZA 2014', 93, 375, 1090, 568, 1113),
  l('12014', 82, 488, 1093, 566, 1112),
  l('Eenhena un de Pepi', 43, 344, 1120, 561, 1148),
  l('Enlotlade on bs Pipiled', 44, 346, 1121, 604, 1156),
  l('OSA', 46, 459, 1162, 525, 1200),
  l('FICADA', 91, 575, 1195, 628, 1207),
  l('A', 89, 549, 1198, 555, 1201),
  l('di', 48, 738, 1199, 787, 1207),
  l('pi', 45, 786, 1241, 806, 1249),
  l('“4', 65, 946, 1288, 962, 1303),
  l('LEE', 47, 33, 1299, 88, 1309),
  l('ET.', 39, 5, 1313, 107, 1325),
  l('TMAZ', 75, 374, 1335, 421, 1349),
  l('IMAZ', 85, 375, 1337, 421, 1348),
  l('1548', 94, 505, 1338, 542, 1355),
  l('m', 51, 165, 1422, 242, 1430),
  l('ze', 62, 744, 1471, 776, 1483),
  l('u', 66, 942, 1498, 962, 1509),
  l('ze', 60, 879, 1506, 902, 1514),
  l('è', 93, 285, 1509, 295, 1518),
  l('FE', 56, 676, 1536, 702, 1573),
  l('x', 46, 599, 1540, 613, 1564),
  l('2', 82, 555, 1541, 568, 1558),
  l('re', 36, 0, 1567, 237, 1584),
  l('À', 82, 674, 1573, 695, 1595),
  l('es', 48, 763, 1578, 786, 1589),
  l('me', 38, 25, 1581, 226, 1595),
  l('DI', 58, 934, 1584, 950, 1592),
  l('Sh', 59, 934, 1597, 953, 1602),
  l('m', 70, 686, 1600, 697, 1606),
  l('mn', 37, 98, 1606, 222, 1616),
  l('EE', 33, 0, 1632, 172, 1646),
  l('ee', 44, 0, 1644, 200, 1669),
  l('À', 60, 703, 1648, 713, 1658),
  l('mi', 84, 535, 1653, 558, 1667),
  l('u 1', 72, 600, 1654, 634, 1683),
  l('tlh', 37, 673, 1663, 709, 1680),
  l('br', 48, 547, 1670, 557, 1677),
  l('A', 62, 857, 1685, 875, 1695),
  l('ce', 42, 546, 1697, 560, 1703),
  l('ee ad', 42, 0, 1727, 169, 1738),
  l('PI', 64, 740, 1742, 753, 1749),
  l('‘iB', 67, 587, 1744, 605, 1751),
  l('nos', 62, 816, 1746, 841, 1750),
  l('E', 47, 34, 1752, 127, 1759),
  l('LE', 73, 944, 1780, 962, 1792),
  l('ar', 42, 669, 1786, 686, 1798),
  l('on', 54, 738, 1790, 782, 1797),
  l('na', 40, 0, 1815, 223, 1842),
  l('Li', 67, 540, 1817, 556, 1830),
  l('Pr', 51, 825, 1837, 839, 1845),
  l('So E', 36, 10, 1847, 204, 1854),
  l('neve', 34, 129, 1857, 212, 1863),
  l('DA', 68, 861, 1863, 897, 1868),
  l('ott', 38, 496, 1889, 572, 1914),
  l('ect', 36, 902, 1899, 935, 1907),
  l('ar', 46, 875, 1916, 956, 1925),
  l('pren', 30, 647, 1919, 852, 1935),
  l('TE Le + Rasen', 30, 622, 1931, 927, 1949),
  l('va', 36, 843, 1947, 869, 1954),
  l('Cone ate', 37, 200, 1955, 345, 1968),
  l('rats ile - :', 38, 762, 1960, 965, 2000),
  l('e "CESSI', 43, 0, 1964, 314, 1986),
  l('SS', 43, 670, 1964, 752, 1968),
  l('as', 46, 538, 1969, 577, 1973),
  l('mer ven', 30, 311, 1971, 507, 1985),
  l('2', 39, 517, 1982, 540, 1987),
]

const rotkaeppchenTrocken: OcrLine[] = [
  l('ee', 45, 266, 86, 339, 101),
  l('da', 42, 381, 89, 440, 132),
  l('as', 46, 309, 109, 334, 120),
  l('iy', 70, 374, 206, 387, 220),
  l('AES È', 72, 275, 231, 361, 283),
  l('Ai', 43, 246, 337, 267, 366),
  l('AAA :', 38, 288, 502, 349, 518),
  l('M', 59, 275, 526, 315, 558),
  l('La', 53, 307, 550, 338, 575),
  l('È;', 45, 323, 667, 362, 731),
  l('SELT', 85, 231, 718, 264, 732),
  l('Rig', 57, 378, 724, 402, 739),
  l('Ty', 30, 205, 772, 428, 835),
  l('A', 82, 345, 846, 422, 895),
  l('il', 85, 550, 959, 642, 1050),
  l('ce |', 31, 159, 1293, 353, 1330),
  l('Ay', 55, 500, 1332, 642, 1417),
  l('Du', 43, 333, 1349, 353, 1361),
  l('ne', 53, 56, 1357, 363, 1430),
  l('LE SR', 30, 563, 1411, 632, 1426),
  l('ÉD 05', 50, 343, 1465, 416, 1506),
  l('SEIT', 96, 202, 1485, 252, 1507),
  l('856', 92, 391, 1485, 431, 1505),
  l('ie', 36, 343, 1502, 361, 1520),
  l('chel', 69, 437, 1535, 560, 1638),
  l('Y) neh', 60, 303, 1536, 519, 1682),
  l('awn', 68, 300, 1579, 331, 1591),
  l('08', 67, 494, 1661, 528, 1694),
  l('ompos!!', 53, 359, 1673, 491, 1744),
  l('rer', 49, 64, 1675, 354, 1756),
  l('I osil', 61, 414, 1681, 486, 1713),
  l('x', 42, 0, 1683, 42, 1722),
  l('FEINSTE:', 55, 163, 1687, 307, 1720),
  l('TROCKEN’', 88, 214, 1772, 426, 1812),
  l('Pr', 48, 345, 1947, 358, 1954),
]

const rotkaeppchenMild: OcrLine[] = [
  l('ii:', 32, 15, 0, 248, 156),
  l('u', 71, 1033, 0, 1140, 35),
  l('a’', 35, 1060, 0, 1137, 24),
  l('p +', 69, 1156, 63, 1296, 130),
  l('i...', 43, 1320, 130, 1382, 171),
  l('re', 33, 27, 169, 428, 262),
  l('A', 66, 1547, 220, 1563, 238),
  l('St gi', 53, 1497, 286, 1568, 317),
  l('Le', 46, 1040, 450, 1255, 539),
  l('IENE)', 40, 1049, 466, 1282, 534),
  l('LA', 58, 1027, 572, 1123, 686),
  l('1856', 96, 1309, 611, 1433, 663),
  l('SEIT', 91, 665, 615, 835, 668),
  l('en', 37, 1040, 781, 1175, 826),
  l('chi', 89, 1420, 820, 1629, 1143),
  l('ché', 71, 1420, 828, 1692, 1138),
  l('aa', 89, 1021, 957, 1129, 999),
  l('no! &,', 53, 1447, 1228, 1689, 1373),
  l('mpos', 77, 1232, 1331, 1434, 1432),
  l('SEKT FEINSTER KO', 92, 305, 1364, 1214, 1468),
  l('LE ope en.', 35, 256, 1519, 453, 1575),
  l('en', 56, 1015, 1571, 1066, 1582),
  l('ae en', 45, 726, 1580, 976, 1593),
  l('u', 58, 1307, 1714, 1359, 1737),
  l('» ro', 42, 149, 1715, 866, 1850),
  l('pi', 52, 1093, 1910, 1183, 1947),
  l('n° I [Mr', 46, 512, 1924, 765, 1990),
  l('he', 50, 919, 1942, 975, 1974),
]
