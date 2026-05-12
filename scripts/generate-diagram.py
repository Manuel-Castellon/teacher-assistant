#!/usr/bin/env python3
"""Generate geometry diagram for exam Q4 as SVG."""

import math
import sys
import os

def generate_triangle_similarity_svg(output_path: str):
    # Triangle ABC, right angle at B
    # AB = 9, BC = 12, AC = 15
    # Place B at origin, A up, C to the right
    # B = (0, 0), A = (0, 9), C = (12, 0)
    B = (0, 0)
    A = (0, 9)
    C = (12, 0)
    AB = 9
    AC = 15

    # D is on AC with AD = 6
    # AC vector: C - A = (12, -9), length 15
    # D = A + (6/15) * (C - A)
    t = 6 / 15
    D = (A[0] + t * (C[0] - A[0]), A[1] + t * (C[1] - A[1]))
    # D = (0 + 0.4*12, 9 + 0.4*(-9)) = (4.8, 5.4)

    # E is on AB with angle AED = 90
    # From similarity: AE/AB = AD/AC = 6/15 = 2/5
    # AE = 9 * 2/5 = 3.6
    # AB vector: B - A = (0, -9)
    # E = A + (3.6/9) * (B - A) = (0, 9 + 0.4*(-9)) = (0, 5.4)
    s = 3.6 / 9
    E = (A[0] + s * (B[0] - A[0]), A[1] + s * (B[1] - A[1]))

    # SVG coordinate system: y increases downward, so flip y
    def to_svg(p, scale=30, margin=60):
        return (p[0] * scale + margin, (10 - p[1]) * scale + margin)

    scale = 30
    margin = 60
    width = 12 * scale + 2 * margin
    height = 10 * scale + 2 * margin

    As = to_svg(A)
    Bs = to_svg(B)
    Cs = to_svg(C)
    Ds = to_svg(D)
    Es = to_svg(E)

    # Right angle marker at B (between BA and BC)
    sq = 12  # size of the square marker
    right_angle_B = f'<path d="M {Bs[0]} {Bs[1]-sq} L {Bs[0]+sq} {Bs[1]-sq} L {Bs[0]+sq} {Bs[1]}" fill="none" stroke="black" stroke-width="1"/>'

    # Right angle marker at E (angle AED = 90)
    # At E, the two directions are EA (up along AB) and ED
    # EA direction: (0, -1) in SVG => (0, -sq)
    # ED direction: normalize D-E in SVG coords
    ed_x = Ds[0] - Es[0]
    ed_y = Ds[1] - Es[1]
    ed_len = math.sqrt(ed_x**2 + ed_y**2)
    ed_ux = ed_x / ed_len * sq
    ed_uy = ed_y / ed_len * sq
    # EA direction in SVG: toward A (up)
    ea_x = As[0] - Es[0]
    ea_y = As[1] - Es[1]
    ea_len = math.sqrt(ea_x**2 + ea_y**2)
    ea_ux = ea_x / ea_len * sq
    ea_uy = ea_y / ea_len * sq

    right_angle_E = f'<path d="M {Es[0]+ea_ux:.1f} {Es[1]+ea_uy:.1f} L {Es[0]+ea_ux+ed_ux:.1f} {Es[1]+ea_uy+ed_uy:.1f} L {Es[0]+ed_ux:.1f} {Es[1]+ed_uy:.1f}" fill="none" stroke="black" stroke-width="1"/>'

    # Label offsets (tuned for RTL-friendly positioning)
    label_offset = 18
    font_size = 16

    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" direction="rtl">
  <style>
    text {{ font-family: Arial, sans-serif; font-size: {font_size}px; }}
    .label {{ font-weight: bold; }}
  </style>

  <!-- Triangle ABC -->
  <polygon points="{As[0]},{As[1]} {Bs[0]},{Bs[1]} {Cs[0]},{Cs[1]}"
           fill="none" stroke="black" stroke-width="2"/>

  <!-- DE segment -->
  <line x1="{Ds[0]}" y1="{Ds[1]}" x2="{Es[0]}" y2="{Es[1]}"
        stroke="black" stroke-width="1.5" stroke-dasharray="6,3"/>

  <!-- Right angle at B -->
  {right_angle_B}

  <!-- Right angle at E -->
  {right_angle_E}

  <!-- Vertex labels -->
  <text x="{As[0] - label_offset}" y="{As[1] - 10}" class="label" text-anchor="end">A</text>
  <text x="{Bs[0] - label_offset}" y="{Bs[1] + 8}" class="label" text-anchor="end">B</text>
  <text x="{Cs[0] + 10}" y="{Cs[1] + 8}" class="label" text-anchor="start">C</text>
  <text x="{Ds[0] + 12}" y="{Ds[1] - 8}" class="label" text-anchor="start">D</text>
  <text x="{Es[0] - label_offset}" y="{Es[1] + 5}" class="label" text-anchor="end">E</text>

</svg>'''

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(svg)
    print(f"Diagram written to {output_path}")

    # Verify coordinates
    print(f"A={A}, B={B}, C={C}, D=({D[0]:.1f},{D[1]:.1f}), E=({E[0]:.1f},{E[1]:.1f})")
    ad = math.sqrt((D[0]-A[0])**2 + (D[1]-A[1])**2)
    de = math.sqrt((E[0]-D[0])**2 + (E[1]-D[1])**2)
    ae = math.sqrt((E[0]-A[0])**2 + (E[1]-A[1])**2)
    print(f"AD={ad:.1f}, DE={de:.1f}, AE={ae:.1f}")


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "output/diagram-q4.svg"
    generate_triangle_similarity_svg(out)
