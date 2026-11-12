"""Material vocabulary shared by the local CV pass and the vision-model pass.

Codes match web/assets/js/data.js (FT.materials):
  CS   carbon steel (black, painted, red FP, grooved/welded/flanged)
  SS   stainless steel (mill finish / bright sheen, thin wall, orbital or TIG welds)
  CU   copper (Type K/L/M tube, soldered/brazed/press)
  GALV galvanized steel (zinc coating: dull grey, spangle or mottling, threaded)
  COMP composite & plastic (GRE/GRP, PEX-AL-PEX = true composites; PEX, CPVC, PVC, PP-R = thermoplastics)
  UNK  not determinable from the photo (e.g. insulation jacket hides the pipe)
"""
import colorsys

CODES = ("CS", "SS", "CU", "GALV", "COMP", "UNK")


def classify(stats):
    """Suggest a material from colour/texture statistics of the pixels inside one pipe band.

    stats: dict with h (0-360), s (0-1), v (0-1) medians, v_std, spec (fraction of near-white
    specular pixels), sat_frac (fraction strongly saturated), texture (normalised Laplacian energy),
    width_px. Returns (code, sub, confidence, cues[], alternatives[]). Confidence is deliberately
    capped: colour alone cannot prove a material, and paint/insulation hide the base metal.
    """
    h, s, v = stats["h"], stats["s"], stats["v"]
    vstd, spec, tex = stats["v_std"], stats["spec"], stats["texture"]
    cues, alt = [], []

    def out(code, sub, conf, more_cues, alts):
        return code, sub, round(min(conf, 0.7), 2), cues + more_cues, alts

    # strongly coloured surfaces first
    if s > 0.28 and v > 0.25:
        if 8 <= h <= 32:  # orange-brown family: copper vs CPVC (matte orange plastic)
            if spec > 0.015 or vstd > 0.16:
                return out("CU", "Copper tube (type not determinable)", 0.62 if s > 0.4 else 0.52,
                           [f"Copper hue ({h:.0f}°) with metallic highlights", "Type K/L/M and size need a print line or scale"], ["COMP (CPVC)", "Painted pipe"])
            return out("COMP", "CPVC? (matte orange)", 0.45,
                       [f"Orange hue ({h:.0f}°) but matte, low specular — reads like plastic", "Look for print line (e.g. CPVC / sprinkler)"], ["CU (dull or oxidised copper)"])
        if h < 8 or h > 340:
            return out("CS", "Painted steel (red — fire protection colour)", 0.5,
                       ["Red finish — typical sprinkler paint", "Base metal hidden by paint (CS most common)"], ["COMP (red PEX, if small and flexible)", "GALV under paint"])
        if 190 <= h <= 250:
            return out("COMP", "PEX? (blue)", 0.48,
                       ["Saturated blue jacket — typical of PEX cold lines", "Could be painted steel or a blue-coded line"], ["Painted CS"])
        if 40 <= h <= 70:
            return out("CS", "Painted steel (yellow — often gas)", 0.38,
                       ["Yellow finish — commonly gas piping", "Base metal hidden by paint"], ["GALV under paint"])
        if 70 < h < 170:
            return out("UNK", "Painted / coded — material hidden", 0.3,
                       [f"Green-coded finish ({h:.0f}°) hides base material"], ["CS", "COMP (PVC)"])
    # low saturation: whites, greys, blacks, metals
    if v > 0.78 and s < 0.12 and vstd < 0.1 and spec < 0.03:
        return out("UNK", "Insulated / jacketed or white plastic", 0.35,
                   ["Uniform white/cream, matte — insulation jacket (PVC/ASJ) or PVC pipe", "Base pipe material not visible"], ["COMP (PVC)", "Concealed CS/CU under insulation"])
    if v < 0.25:
        return out("CS", "Black steel? (dark finish)", 0.45,
                   ["Dark, low-saturation finish — black steel or black insulation", "Cannot see welds/threads at this resolution"], ["Black closed-cell insulation (concealed)", "Painted pipe"])
    if s < 0.16 and v > 0.5 and (spec > 0.04 or vstd > 0.2):
        return out("SS", "Stainless? (bright metallic, low saturation)", 0.42,
                   ["Bright, unsaturated metal with strong specular streaks", "Aluminium insulation jacket looks similar — check for jacket seams/bands"], ["Aluminium jacket over insulation", "GALV (new, bright)"])
    if s < 0.18 and 0.3 <= v <= 0.75:
        if tex > 0.5:
            return out("GALV", "Galvanized? (dull zinc grey, mottled)", 0.4,
                       ["Dull grey with mottled texture — consistent with zinc coating", "Grey paint and weathered stainless look similar"], ["Painted CS (grey)", "SS (dull)"])
        return out("CS", "Grey — painted or galvanized steel", 0.33,
                   ["Mid-grey, smooth — grey-painted steel or galvanized", "Base metal not determinable from colour"], ["GALV", "SS"])
    return out("UNK", "Not determinable from colour", 0.25, ["Mixed lighting / colour cast"], ["CS", "GALV", "SS"])


def hsv_from_rgb(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return h * 360, s, v


# Outside diameters (inches) used when a reviewer confirms one size to set scale.
OD_STEEL = {"1/2\"": 0.840, "3/4\"": 1.050, "1\"": 1.315, "1-1/4\"": 1.660, "1-1/2\"": 1.900, "2\"": 2.375, "2-1/2\"": 2.875,
            "3\"": 3.500, "4\"": 4.500, "6\"": 6.625, "8\"": 8.625, "10\"": 10.75, "12\"": 12.75}
OD_CTS = {"1/2\"": 0.625, "3/4\"": 0.875, "1\"": 1.125, "1-1/4\"": 1.375, "1-1/2\"": 1.625, "2\"": 2.125, "2-1/2\"": 2.625,
          "3\"": 3.125, "4\"": 4.125}
