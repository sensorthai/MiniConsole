import bpy
import bmesh
import math
import os


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def create_material(name, color, metallic=0.8, roughness=0.25, emission=None, emission_strength=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if emission:
            if "Emission Color" in bsdf.inputs:
                bsdf.inputs["Emission Color"].default_value = emission
                bsdf.inputs["Emission Strength"].default_value = emission_strength
            elif "Emission" in bsdf.inputs:
                bsdf.inputs["Emission"].default_value = emission
    return mat


def add_hex_ring(name, inner_r, outer_r, height, z_center, mat, segments=6):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    bm = bmesh.new()
    top_z = z_center + height / 2.0
    bot_z = z_center - height / 2.0

    if inner_r <= 0.01:
        # Solid hexagonal prism
        top_verts = []
        bot_verts = []
        for i in range(segments):
            ang = (i / segments) * math.pi * 2.0
            x = math.cos(ang) * outer_r
            y = math.sin(ang) * outer_r
            top_verts.append(bm.verts.new((x, y, top_z)))
            bot_verts.append(bm.verts.new((x, y, bot_z)))
        bm.faces.new(top_verts)
        bm.faces.new(list(reversed(bot_verts)))
        for i in range(segments):
            ni = (i + 1) % segments
            bm.faces.new([bot_verts[i], bot_verts[ni], top_verts[ni], top_verts[i]])
    else:
        # Hollow hexagonal ring prism
        top_in, top_out, bot_in, bot_out = [], [], [], []
        for i in range(segments):
            ang = (i / segments) * math.pi * 2.0
            c, s = math.cos(ang), math.sin(ang)
            top_in.append(bm.verts.new((c * inner_r, s * inner_r, top_z)))
            top_out.append(bm.verts.new((c * outer_r, s * outer_r, top_z)))
            bot_in.append(bm.verts.new((c * inner_r, s * inner_r, bot_z)))
            bot_out.append(bm.verts.new((c * outer_r, s * outer_r, bot_z)))
        for i in range(segments):
            ni = (i + 1) % segments
            bm.faces.new([top_in[i], top_out[i], top_out[ni], top_in[ni]])
            bm.faces.new([bot_out[i], bot_in[i], bot_in[ni], bot_out[ni]])
            bm.faces.new([bot_out[i], bot_out[ni], top_out[ni], top_out[i]])
            bm.faces.new([top_in[i], top_in[ni], bot_in[ni], bot_in[i]])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    if mat:
        obj.data.materials.append(mat)
    return obj


def add_box(name, size, location, mat, rotation=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
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


def build_billboard(idx, x, y, yaw_rad, mats):
    tilt = math.radians(18.0)
    for sx in (-3.0, 3.0):
        lx = x + sx * math.cos(yaw_rad)
        ly = y + sx * math.sin(yaw_rad)
        add_box(f"Stadium_BillboardLeg_{idx}_{sx}", (0.35, 0.35, 5.2), (lx, ly, 1.4), mats["dark_armor"], (0, 0, yaw_rad))

    frame_z = 4.1
    add_box(f"Stadium_BillboardFrame_{idx}", (8.2, 0.45, 3.2), (x, y, frame_z), mats["dark_armor"], (tilt, 0.0, yaw_rad))

    for bar_offset, mat_key in ((1.65, "neon_cyan"), (-1.65, "neon_pink")):
        bz = frame_z + bar_offset * math.cos(tilt)
        by_off = -bar_offset * math.sin(tilt)
        bx = x - by_off * math.sin(yaw_rad)
        by = y + by_off * math.cos(yaw_rad)
        add_box(f"Stadium_BillboardNeon_{idx}_{mat_key}", (8.35, 0.52, 0.16), (bx, by, bz), mats[mat_key], (tilt, 0.0, yaw_rad))

    screen_offset = -0.26
    sx = x - screen_offset * math.sin(yaw_rad)
    sy = y + screen_offset * math.cos(yaw_rad)
    bpy.ops.mesh.primitive_plane_add(
        size=1.0,
        location=(sx, sy, frame_z),
        rotation=(math.pi / 2.0 + tilt, 0.0, yaw_rad),
    )
    screen = bpy.context.active_object
    screen.name = f"Billboard_Screen_{idx}"
    screen.scale = (7.7, 2.75, 1.0)
    screen.data.materials.append(mats["screen_default"])


def build_sumo_arena(output_path):
    clear_scene()

    mats = {
        "ring0": create_material("SumoRing0", (0.08, 0.13, 0.22, 1.0), metallic=0.72, roughness=0.30),
        "ring1": create_material("SumoRing1", (0.11, 0.17, 0.28, 1.0), metallic=0.72, roughness=0.30),
        "ring2": create_material("SumoRing2", (0.14, 0.21, 0.34, 1.0), metallic=0.72, roughness=0.30),
        "dark_armor": create_material("DarkArmor", (0.03, 0.04, 0.07, 1.0), metallic=0.88, roughness=0.25),
        "neon_cyan": create_material("NeonCyan", (0.0, 0.94, 1.0, 1.0), metallic=0.2, roughness=0.1, emission=(0.0, 0.94, 1.0, 1.0), emission_strength=4.5),
        "neon_pink": create_material("NeonPink", (1.0, 0.16, 0.43, 1.0), metallic=0.2, roughness=0.1, emission=(1.0, 0.16, 0.43, 1.0), emission_strength=4.5),
        "neon_amber": create_material("NeonAmber", (1.0, 0.65, 0.0, 1.0), metallic=0.2, roughness=0.1, emission=(1.0, 0.65, 0.0, 1.0), emission_strength=4.0),
        "screen_default": create_material("BillboardScreen", (0.05, 0.12, 0.22, 1.0), metallic=0.1, roughness=0.2, emission=(0.15, 0.45, 0.85, 1.0), emission_strength=1.5),
    }

    # 1. Three shrinkable hexagonal rings (top surface at z = 0)
    # Ring 0 (inner core: 0 -> 8.0)
    add_hex_ring("SumoRing_0_Deck", 0.0, 8.0, 1.0, -0.5, mats["ring0"])
    add_hex_ring("SumoRing_0_Trim", 7.82, 8.02, 0.14, 0.02, mats["neon_cyan"])
    add_hex_ring("SumoRing_0_CenterEmblem", 2.4, 2.75, 0.06, 0.01, mats["neon_pink"])

    # Ring 1 (middle: 8.1 -> 13.0)
    add_hex_ring("SumoRing_1_Deck", 8.1, 13.0, 1.0, -0.5, mats["ring1"])
    add_hex_ring("SumoRing_1_Trim", 12.82, 13.02, 0.14, 0.02, mats["neon_amber"])

    # Ring 2 (outer: 13.1 -> 18.0)
    add_hex_ring("SumoRing_2_Deck", 13.1, 18.0, 1.0, -0.5, mats["ring2"])
    add_hex_ring("SumoRing_2_Trim", 17.82, 18.04, 0.16, 0.02, mats["neon_pink"])

    # 2. Outer Stadium Ring Walkway + Pylons (outside playable radius 18 -> at radius 22.5..25)
    add_hex_ring("Stadium_OuterWalkway", 22.0, 24.5, 1.4, -1.6, mats["dark_armor"])
    add_hex_ring("Stadium_OuterGlow", 22.0, 22.25, 0.2, -0.85, mats["neon_cyan"])

    # 6 Corner Stadium Light Towers at hex vertices (radius 23.6)
    for i in range(6):
        ang = (i / 6.0) * math.pi * 2.0
        tx = math.cos(ang) * 23.6
        ty = math.sin(ang) * 23.6
        add_cylinder(f"Stadium_Tower_{i}", 1.1, 9.0, 6, (tx, ty, 2.5), mats["dark_armor"])
        add_cylinder(f"Stadium_TowerGlow_{i}", 1.25, 0.45, 6, (tx, ty, 6.2), mats["neon_cyan"] if i % 2 == 0 else mats["neon_pink"])

    # 6 Perimeter Sponsor Billboards along the 6 hex edges (radius 22.8, facing inward)
    for i in range(6):
        ang = ((i + 0.5) / 6.0) * math.pi * 2.0
        bx = math.cos(ang) * 22.8
        by = math.sin(ang) * 22.8
        # Face inward toward (0,0): local -Y points toward (cos(ang+pi), sin(ang+pi))
        yaw = ang - math.pi / 2.0
        build_billboard(i, bx, by, yaw, mats)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    blend_path = os.path.splitext(output_path)[0] + ".blend"
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"Saved Sumo Arena .blend to: {blend_path}")

    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format="GLB",
        export_yup=True,
        export_materials="EXPORT",
    )
    print(f"Exported Sumo Arena GLB to: {output_path}")


if __name__ == "__main__":
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    out_glb = os.path.join(project_root, "public", "models", "sumo_arena.glb")
    build_sumo_arena(out_glb)
