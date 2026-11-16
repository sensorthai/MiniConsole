import bpy
import math
import os
import random


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def create_material(name, color, metallic=0.0, roughness=0.75, emission=None, emission_strength=1.0, alpha=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if alpha < 1.0:
            bsdf.inputs["Alpha"].default_value = alpha
            mat.blend_method = "BLEND" if hasattr(mat, "blend_method") else "OPAQUE"
        if emission:
            if "Emission Color" in bsdf.inputs:
                bsdf.inputs["Emission Color"].default_value = emission
                bsdf.inputs["Emission Strength"].default_value = emission_strength
            elif "Emission" in bsdf.inputs:
                bsdf.inputs["Emission"].default_value = emission
    return mat


def add_box(name, size, location, mat, rotation=(0.0, 0.0, 0.0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    if bevel > 0.0:
        mod = obj.modifiers.new(name="Bevel", type="BEVEL")
        mod.width = bevel
        mod.segments = 3
    if mat:
        obj.data.materials.append(mat)
    return obj


def add_cylinder(name, radius, depth, vertices, location, mat, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation
    )
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    return obj


def add_arc_line(name, cx, cy, radius, start_ang, end_ang, width, mat, segments=24):
    # Create thin arc segments on z = 0.02
    for i in range(segments):
        a0 = start_ang + (end_ang - start_ang) * (i / segments)
        a1 = start_ang + (end_ang - start_ang) * ((i + 1) / segments)
        am = (a0 + a1) * 0.5
        seg_len = radius * abs(a1 - a0) * 1.08
        px = cx + math.cos(am) * radius
        py = cy + math.sin(am) * radius
        add_box(f"{name}_{i}", (seg_len, width, 0.025), (px, py, 0.02), mat, (0.0, 0.0, am + math.pi / 2.0))


def build_white_goal(name_prefix, x_pos, sign_x, mats):
    goal_w = 9.0
    goal_h = 5.0
    goal_d = 3.8
    # White posts and crossbar
    add_cylinder(f"{name_prefix}_PostL", 0.28, goal_h, 12, (x_pos, -goal_w, goal_h / 2.0), mats["goal_white"])
    add_cylinder(f"{name_prefix}_PostR", 0.28, goal_h, 12, (x_pos, goal_w, goal_h / 2.0), mats["goal_white"])
    add_cylinder(f"{name_prefix}_Crossbar", 0.28, goal_w * 2.0 + 0.5, 12, (x_pos, 0.0, goal_h), mats["goal_white"], (math.pi / 2.0, 0.0, 0.0))

    # Back support frame
    bx = x_pos + sign_x * goal_d
    add_cylinder(f"{name_prefix}_BackPostL", 0.18, goal_h * 0.85, 10, (bx, -goal_w, goal_h * 0.425), mats["goal_white"])
    add_cylinder(f"{name_prefix}_BackPostR", 0.18, goal_h * 0.85, 10, (bx, goal_w, goal_h * 0.425), mats["goal_white"])
    add_cylinder(f"{name_prefix}_BackBar", 0.18, goal_w * 2.0, 10, (bx, 0.0, goal_h * 0.85), mats["goal_white"], (math.pi / 2.0, 0.0, 0.0))

    # Translucent white net panels
    add_box(f"{name_prefix}_NetBack", (0.08, goal_w * 2.0, goal_h * 0.85), (bx, 0.0, goal_h * 0.425), mats["net_white"])
    add_box(f"{name_prefix}_NetSideL", (goal_d, 0.08, goal_h * 0.9), (x_pos + sign_x * goal_d * 0.5, -goal_w, goal_h * 0.45), mats["net_white"])
    add_box(f"{name_prefix}_NetSideR", (goal_d, 0.08, goal_h * 0.9), (x_pos + sign_x * goal_d * 0.5, goal_w, goal_h * 0.45), mats["net_white"])
    add_box(f"{name_prefix}_NetTop", (goal_d, goal_w * 2.0, 0.08), (x_pos + sign_x * goal_d * 0.5, 0.0, goal_h * 0.92), mats["net_white"])


def build_floodlight_pole(name, x, y, yaw_rad, mats):
    pole_h = 11.5
    add_cylinder(f"{name}_Pole", 0.28, pole_h, 10, (x, y, pole_h / 2.0), mats["dark_metal"])
    # Angled light head arm
    arm_dx = math.cos(yaw_rad) * 1.4
    arm_dy = math.sin(yaw_rad) * 1.4
    add_box(f"{name}_Arm", (2.8, 0.35, 0.28), (x + arm_dx * 0.5, y + arm_dy * 0.5, pole_h), mats["dark_metal"], (0.0, 0.15, yaw_rad))
    add_box(f"{name}_LampHead", (1.8, 1.1, 0.22), (x + arm_dx, y + arm_dy, pole_h - 0.12), mats["floodlight_glow"], (0.0, 0.25, yaw_rad))


def build_bush(name, x, y, radius, mats):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=radius, location=(x, y, radius * 0.82))
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(mats["bush_green"])


def build_dugout_bench(name, x, y, mats):
    # Side dugout shelter matching the reference image
    add_box(f"{name}_Back", (7.5, 0.25, 2.8), (x, y, 1.4), mats["fence_white"])
    add_box(f"{name}_Roof", (7.8, 2.2, 0.22), (x, y - 0.9, 2.85), mats["fence_white"], (0.15, 0.0, 0.0))
    add_box(f"{name}_SideL", (0.2, 2.0, 2.8), (x - 3.65, y - 0.9, 1.4), mats["dark_metal"])
    add_box(f"{name}_SideR", (0.2, 2.0, 2.8), (x + 3.65, y - 0.9, 1.4), mats["dark_metal"])
    add_box(f"{name}_Seat", (6.8, 0.8, 0.45), (x, y - 0.7, 0.5), mats["dark_metal"])


def build_soccer_stadium(output_path):
    clear_scene()
    random.seed(42)

    pitch_l = 34.0
    pitch_w = 22.0

    mats = {
        "grass_light": create_material("GrassLight", (0.16, 0.48, 0.12, 1.0), metallic=0.0, roughness=0.85),
        "grass_dark": create_material("GrassDark", (0.12, 0.39, 0.09, 1.0), metallic=0.0, roughness=0.88),
        "grass_border": create_material("GrassBorder", (0.10, 0.31, 0.07, 1.0), metallic=0.0, roughness=0.92),
        "soil_rim": create_material("SoilRim", (0.34, 0.21, 0.12, 1.0), metallic=0.0, roughness=0.92),
        "soil_mid": create_material("SoilMid", (0.62, 0.43, 0.22, 1.0), metallic=0.0, roughness=0.95),
        "soil_deep": create_material("SoilDeep", (0.24, 0.15, 0.09, 1.0), metallic=0.0, roughness=0.95),
        "line_white": create_material("LineWhite", (0.96, 0.97, 0.96, 1.0), metallic=0.0, roughness=0.45, emission=(0.9, 0.95, 0.9, 1.0), emission_strength=0.35),
        "goal_white": create_material("GoalWhite", (0.94, 0.95, 0.96, 1.0), metallic=0.15, roughness=0.3),
        "net_white": create_material("NetWhite", (0.92, 0.95, 0.98, 1.0), metallic=0.0, roughness=0.5, alpha=0.38),
        "fence_white": create_material("FenceWhite", (0.90, 0.92, 0.95, 1.0), metallic=0.05, roughness=0.35, alpha=0.55),
        "dark_metal": create_material("DarkMetal", (0.10, 0.11, 0.13, 1.0), metallic=0.75, roughness=0.35),
        "floodlight_glow": create_material("FloodlightGlow", (1.0, 0.98, 0.9, 1.0), metallic=0.0, roughness=0.1, emission=(1.0, 0.96, 0.85, 1.0), emission_strength=6.0),
        "bush_green": create_material("BushGreen", (0.18, 0.49, 0.11, 1.0), metallic=0.0, roughness=0.9),
    }

    # 1. Diorama Layered Earth Cutaway Base (78 x 54)
    diorama_w = 78.0
    diorama_d = 54.0
    add_box("Diorama_GrassTurf", (diorama_w, diorama_d, 0.5), (0.0, 0.0, -0.25), mats["grass_border"], bevel=0.18)
    add_box("Diorama_SoilRim", (diorama_w - 0.1, diorama_d - 0.1, 1.1), (0.0, 0.0, -1.05), mats["soil_rim"], bevel=0.15)
    add_box("Diorama_SoilMid", (diorama_w - 0.3, diorama_d - 0.3, 2.2), (0.0, 0.0, -2.7), mats["soil_mid"], bevel=0.15)
    add_box("Diorama_SoilDeep", (diorama_w - 0.5, diorama_d - 0.5, 2.0), (0.0, 0.0, -4.8), mats["soil_deep"], bevel=0.2)

    # Subtle rocky soil chunks along the cutaway sides for organic diorama detail
    for i in range(18):
        rx = random.uniform(-diorama_w * 0.45, diorama_w * 0.45)
        rz = random.uniform(-4.2, -1.4)
        add_box(f"Soil_Chunk_S_{i}", (random.uniform(1.8, 4.2), 0.4, random.uniform(0.5, 1.1)), (rx, -diorama_d * 0.5, rz), mats["soil_rim"])
        add_box(f"Soil_Chunk_N_{i}", (random.uniform(1.8, 4.2), 0.4, random.uniform(0.5, 1.1)), (rx, diorama_d * 0.5, rz), mats["soil_rim"])

    # 2. Mowed Grass Pitch Surface (68 x 44, top at z = 0)
    add_box("Pitch_Base", (pitch_l * 2.0, pitch_w * 2.0, 0.12), (0.0, 0.0, -0.04), mats["grass_light"])
    stripe_w = (pitch_l * 2.0) / 10.0
    for i in range(10):
        if i % 2 == 1:
            sx = -pitch_l + stripe_w * (i + 0.5)
            add_box(f"Pitch_Stripe_{i}", (stripe_w, pitch_w * 2.0, 0.02), (sx, 0.0, 0.01), mats["grass_dark"])

    # 3. Crisp White Field Markings
    lw = 0.35
    # Outer boundary lines
    add_box("Line_North", (pitch_l * 2.0 + lw, lw, 0.025), (0.0, pitch_w, 0.02), mats["line_white"])
    add_box("Line_South", (pitch_l * 2.0 + lw, lw, 0.025), (0.0, -pitch_w, 0.02), mats["line_white"])
    add_box("Line_West", (lw, pitch_w * 2.0, 0.025), (-pitch_l, 0.0, 0.02), mats["line_white"])
    add_box("Line_East", (lw, pitch_w * 2.0, 0.025), (pitch_l, 0.0, 0.02), mats["line_white"])
    add_box("Line_Halfway", (lw, pitch_w * 2.0, 0.025), (0.0, 0.0, 0.02), mats["line_white"])

    # Center circle & spot
    add_arc_line("Line_CenterCircle", 0.0, 0.0, 6.2, 0.0, math.pi * 2.0, lw, mats["line_white"], segments=36)
    add_cylinder("Line_CenterSpot", 0.55, 0.03, 16, (0.0, 0.0, 0.02), mats["line_white"])

    # Penalty & goal areas (Left & Right)
    for sign_x, side_name in ((-1.0, "Left"), (1.0, "Right")):
        gx = sign_x * pitch_l
        # Penalty box (depth 11, half-width 13)
        pb_x = gx - sign_x * 11.0
        add_box(f"Line_PBox_Front_{side_name}", (lw, 26.0 + lw, 0.025), (pb_x, 0.0, 0.02), mats["line_white"])
        add_box(f"Line_PBox_Top_{side_name}", (11.0, lw, 0.025), (gx - sign_x * 5.5, 13.0, 0.02), mats["line_white"])
        add_box(f"Line_PBox_Bot_{side_name}", (11.0, lw, 0.025), (gx - sign_x * 5.5, -13.0, 0.02), mats["line_white"])

        # Goal box (depth 4.5, half-width 9.5)
        gb_x = gx - sign_x * 4.5
        add_box(f"Line_GBox_Front_{side_name}", (lw, 19.0 + lw, 0.025), (gb_x, 0.0, 0.02), mats["line_white"])
        add_box(f"Line_GBox_Top_{side_name}", (4.5, lw, 0.025), (gx - sign_x * 2.25, 9.5, 0.02), mats["line_white"])
        add_box(f"Line_GBox_Bot_{side_name}", (4.5, lw, 0.025), (gx - sign_x * 2.25, -9.5, 0.02), mats["line_white"])

        # Penalty arc
        arc_ang = 0.0 if sign_x < 0 else math.pi
        add_arc_line(f"Line_PArc_{side_name}", gx - sign_x * 8.0, 0.0, 5.2, arc_ang - 0.95, arc_ang + 0.95, lw, mats["line_white"], segments=14)

    # 4. White Goals
    build_white_goal("Goal_Blue", -pitch_l, -1.0, mats)
    build_white_goal("Goal_Red", pitch_l, 1.0, mats)

    # 5. White Translucent Fence & Posts (Back + Left + Right sides, keeping front camera view clear)
    fence_h = 3.4
    # North (back) fence
    add_box("Fence_North_Panel", (74.0, 0.12, fence_h), (0.0, 25.0, fence_h * 0.5), mats["fence_white"])
    for fx in range(-36, 37, 6):
        add_box(f"Fence_North_Post_{fx}", (0.22, 0.22, fence_h + 0.3), (float(fx), 25.0, (fence_h + 0.3) * 0.5), mats["dark_metal"])

    # West & East side fences
    for sign_x, fname in ((-1.0, "West"), (1.0, "East")):
        fx = sign_x * 37.0
        add_box(f"Fence_{fname}_Panel", (0.12, 50.0, fence_h), (fx, 0.0, fence_h * 0.5), mats["fence_white"])
        for fy in range(-24, 25, 6):
            add_box(f"Fence_{fname}_Post_{fy}", (0.22, 0.22, fence_h + 0.3), (fx, float(fy), (fence_h + 0.3) * 0.5), mats["dark_metal"])

    # 6. 6 Black Floodlight Poles (matching reference layout)
    build_floodlight_pole("Flood_NW", -37.2, 25.2, -math.pi * 0.25, mats)
    build_floodlight_pole("Flood_N", 0.0, 25.2, -math.pi * 0.5, mats)
    build_floodlight_pole("Flood_NE", 37.2, 25.2, -math.pi * 0.75, mats)
    build_floodlight_pole("Flood_SW", -37.2, -25.2, math.pi * 0.25, mats)
    build_floodlight_pole("Flood_SE", 37.2, -25.2, math.pi * 0.75, mats)
    build_floodlight_pole("Flood_S", -18.0, -25.2, math.pi * 0.5, mats)

    # 7. Front Sideline Props (Round Green Bushes & Dugout Bench like the reference image)
    build_bush("Bush_Left", -10.5, -24.5, 1.55, mats)
    build_bush("Bush_Right", 28.5, -24.5, 1.65, mats)
    build_dugout_bench("Dugout_Bench", 12.0, -24.2, mats)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    blend_path = os.path.splitext(output_path)[0] + ".blend"
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"Saved Soccer Stadium .blend to: {blend_path}")

    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format="GLB",
        export_yup=True,
        export_materials="EXPORT",
    )
    print(f"Exported Soccer Stadium GLB to: {output_path}")


if __name__ == "__main__":
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    out_glb = os.path.join(project_root, "public", "models", "soccer_stadium.glb")
    build_soccer_stadium(out_glb)
