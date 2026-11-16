import bpy
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


def build_reactor_core(mats):
    # Central octagonal cyber reactor at (0, 0)
    add_cylinder("Reactor_Base", 2.75, 0.45, 8, (0, 0, 0.225), mats["dark_armor"])
    add_cylinder("Reactor_CoreBody", 2.1, 2.8, 8, (0, 0, 1.4), mats["pillar"])
    add_cylinder("Reactor_EnergyRing_Low", 2.25, 0.25, 8, (0, 0, 0.9), mats["neon_cyan"])
    add_cylinder("Reactor_EnergyRing_Mid", 2.25, 0.25, 8, (0, 0, 1.85), mats["neon_pink"])
    add_cylinder("Reactor_Cap", 1.75, 0.5, 8, (0, 0, 3.05), mats["dark_armor"])
    add_cylinder("Reactor_Spire", 0.35, 1.5, 6, (0, 0, 4.0), mats["neon_cyan"])


def build_tactical_barrier(name_prefix, x, y, horizontal, mats):
    # Long tactical energy cover barrier (width ~7.6m, thickness ~2.2m)
    rot_z = 0.0 if horizontal else math.pi / 2.0
    add_box(f"{name_prefix}_Plinth", (7.6, 2.2, 0.35), (x, y, 0.175), mats["dark_armor"], (0, 0, rot_z))
    add_box(f"{name_prefix}_Wall", (6.8, 1.4, 2.2), (x, y, 1.25), mats["pillar"], (0, 0, rot_z))
    add_box(f"{name_prefix}_TopCap", (7.1, 1.65, 0.28), (x, y, 2.45), mats["dark_armor"], (0, 0, rot_z))
    add_box(f"{name_prefix}_NeonStrip", (6.95, 1.52, 0.18), (x, y, 1.85), mats["neon_cyan"], (0, 0, rot_z))
    # End pylons
    for side in (-3.4, 3.4):
        dx = side if horizontal else 0.0
        dy = 0.0 if horizontal else side
        add_box(f"{name_prefix}_EndPylon", (0.85, 1.9, 2.7), (x + dx, y + dy, 1.35), mats["dark_armor"], (0, 0, rot_z))


def build_stepped_bunker(name_prefix, x, y, mats):
    # Multi-tiered cyber bunker pillar
    add_box(f"{name_prefix}_Base", (3.8, 3.8, 0.4), (x, y, 0.2), mats["dark_armor"])
    add_box(f"{name_prefix}_Body", (3.0, 3.0, 2.6), (x, y, 1.5), mats["pillar"])
    add_box(f"{name_prefix}_Trim", (3.18, 3.18, 0.22), (x, y, 2.35), mats["neon_pink"])
    add_box(f"{name_prefix}_Top", (2.2, 2.2, 0.6), (x, y, 3.1), mats["dark_armor"])
    add_cylinder(f"{name_prefix}_Beacon", 0.35, 0.5, 8, (x, y, 3.65), mats["neon_cyan"])


def build_cyber_crate(name_prefix, x, y, mats):
    # Low tactical tech crate
    add_box(f"{name_prefix}_Body", (2.1, 2.1, 1.5), (x, y, 0.75), mats["crate"])
    add_box(f"{name_prefix}_Frame", (2.25, 2.25, 0.24), (x, y, 1.35), mats["dark_armor"])
    add_box(f"{name_prefix}_Glow", (1.6, 2.16, 0.22), (x, y, 0.78), mats["neon_amber"])


def build_billboard(idx, x, y, yaw_rad, mats):
    """
    Create an angled perimeter billboard facing inward toward the arena center.
    Note: Blender +Y is depth (-Z in Three.js), Blender +Z is up (+Y in Three.js).
    Screen plane is created facing -Y locally, then rotated by yaw_rad around Z.
    """
    tilt = math.radians(16.0)
    # Support struts
    for sx in (-3.2, 3.2):
        lx = x + sx * math.cos(yaw_rad)
        ly = y + sx * math.sin(yaw_rad)
        add_box(f"Billboard_Leg_{idx}_{sx}", (0.35, 0.35, 3.6), (lx, ly, 1.8), mats["dark_armor"], (0, 0, yaw_rad))

    # Frame backing box
    frame_z = 3.8
    add_box(
        f"Billboard_Frame_{idx}",
        (8.6, 0.45, 3.4),
        (x, y, frame_z),
        mats["dark_armor"],
        (tilt, 0.0, yaw_rad),
    )

    # Top & bottom neon accent bars
    for bar_offset, mat_key in ((1.75, "neon_cyan"), (-1.75, "neon_pink")):
        bz = frame_z + bar_offset * math.cos(tilt)
        by_off = -bar_offset * math.sin(tilt)
        bx = x - by_off * math.sin(yaw_rad)
        by = y + by_off * math.cos(yaw_rad)
        add_box(
            f"Billboard_Neon_{idx}_{mat_key}",
            (8.7, 0.52, 0.16),
            (bx, by, bz),
            mats[mat_key],
            (tilt, 0.0, yaw_rad),
        )

    # Screen plane facing local -Y (so with yaw=0 at y=+26.2 it faces -Y toward center)
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
    screen.scale = (8.1, 2.9, 1.0)
    screen.data.materials.append(mats["screen_default"])


def build_arena(output_path):
    clear_scene()

    mats = {
        "floor": create_material("ArenaFloor", (0.045, 0.065, 0.12, 1.0), metallic=0.65, roughness=0.38),
        "dark_armor": create_material("DarkArmor", (0.03, 0.04, 0.07, 1.0), metallic=0.88, roughness=0.28),
        "pillar": create_material("CyberPillar", (0.10, 0.14, 0.24, 1.0), metallic=0.82, roughness=0.25),
        "crate": create_material("CyberCrate", (0.14, 0.18, 0.28, 1.0), metallic=0.6, roughness=0.35),
        "neon_cyan": create_material("NeonCyan", (0.0, 0.94, 1.0, 1.0), metallic=0.2, roughness=0.1, emission=(0.0, 0.94, 1.0, 1.0), emission_strength=4.5),
        "neon_pink": create_material("NeonPink", (1.0, 0.16, 0.43, 1.0), metallic=0.2, roughness=0.1, emission=(1.0, 0.16, 0.43, 1.0), emission_strength=4.5),
        "neon_amber": create_material("NeonAmber", (1.0, 0.65, 0.0, 1.0), metallic=0.2, roughness=0.1, emission=(1.0, 0.65, 0.0, 1.0), emission_strength=4.0),
        "screen_default": create_material("BillboardScreen", (0.05, 0.12, 0.22, 1.0), metallic=0.1, roughness=0.2, emission=(0.15, 0.45, 0.85, 1.0), emission_strength=1.5),
    }

    # 1. Main arena floor (48 x 48, top surface at z = 0)
    add_box("Arena_Floor", (48.0, 48.0, 1.0), (0, 0, -0.5), mats["floor"])

    # Perimeter curbs (arenaSize = 24)
    curb_dist = 24.4
    add_box("Perimeter_North", (50.0, 0.9, 1.2), (0, curb_dist, 0.4), mats["dark_armor"])
    add_box("Perimeter_South", (50.0, 0.9, 1.2), (0, -curb_dist, 0.4), mats["dark_armor"])
    add_box("Perimeter_East", (0.9, 50.0, 1.2), (curb_dist, 0, 0.4), mats["dark_armor"])
    add_box("Perimeter_West", (0.9, 50.0, 1.2), (-curb_dist, 0, 0.4), mats["dark_armor"])

    # Glowing perimeter trim strips
    add_box("Perimeter_Glow_N", (48.4, 0.16, 0.16), (0, 24.0, 0.95), mats["neon_pink"])
    add_box("Perimeter_Glow_S", (48.4, 0.16, 0.16), (0, -24.0, 0.95), mats["neon_pink"])
    add_box("Perimeter_Glow_E", (0.16, 48.4, 0.16), (24.0, 0, 0.95), mats["neon_cyan"])
    add_box("Perimeter_Glow_W", (0.16, 48.4, 0.16), (-24.0, 0, 0.95), mats["neon_cyan"])

    # Embedded floor lane accent strips
    for angle_deg in (0, 90):
        rot = math.radians(angle_deg)
        add_box(f"Floor_Strip_{angle_deg}", (44.0, 0.25, 0.04), (0, 0, 0.01), mats["neon_cyan"], (0, 0, rot))

    # 2. Varied Tactical Obstacles
    build_reactor_core(mats)

    build_tactical_barrier("Barrier_N", 0.0, 13.0, True, mats)
    build_tactical_barrier("Barrier_S", 0.0, -13.0, True, mats)
    build_tactical_barrier("Barrier_E", 13.0, 0.0, False, mats)
    build_tactical_barrier("Barrier_W", -13.0, 0.0, False, mats)

    for idx, (bx, by) in enumerate(((-9.5, -9.5), (9.5, -9.5), (-9.5, 9.5), (9.5, 9.5))):
        build_stepped_bunker(f"Bunker_{idx}", bx, by, mats)

    for idx, (cx, cy) in enumerate(((-17.5, -6.5), (17.5, -6.5), (-17.5, 6.5), (17.5, 6.5))):
        build_cyber_crate(f"Crate_{idx}", cx, cy, mats)

    # 3. 12 Perimeter Advertising Billboards (3 per side)
    billboard_idx = 0
    # North side (y = +26.2, facing -Y)
    for x_pos in (-14.0, 0.0, 14.0):
        build_billboard(billboard_idx, x_pos, 26.2, 0.0, mats)
        billboard_idx += 1
    # South side (y = -26.2, facing +Y)
    for x_pos in (-14.0, 0.0, 14.0):
        build_billboard(billboard_idx, x_pos, -26.2, math.pi, mats)
        billboard_idx += 1
    # East side (x = +26.2, facing -X)
    for y_pos in (-14.0, 0.0, 14.0):
        build_billboard(billboard_idx, 26.2, y_pos, -math.pi / 2.0, mats)
        billboard_idx += 1
    # West side (x = -26.2, facing +X)
    for y_pos in (-14.0, 0.0, 14.0):
        build_billboard(billboard_idx, -26.2, y_pos, math.pi / 2.0, mats)
        billboard_idx += 1

    # 4. Corner Stadium Light Towers
    for idx, (tx, ty) in enumerate(((-25.5, -25.5), (25.5, -25.5), (-25.5, 25.5), (25.5, 25.5))):
        add_cylinder(f"Tower_Base_{idx}", 1.3, 6.5, 8, (tx, ty, 3.25), mats["dark_armor"])
        add_cylinder(f"Tower_Glow_{idx}", 1.45, 0.45, 8, (tx, ty, 5.8), mats["neon_cyan"])

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    blend_path = os.path.splitext(output_path)[0] + ".blend"
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"Saved Arena Blaster .blend to: {blend_path}")

    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format="GLB",
        export_yup=True,
        export_materials="EXPORT",
    )
    print(f"Exported Arena Blaster GLB to: {output_path}")


if __name__ == "__main__":
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    out_glb = os.path.join(project_root, "public", "models", "arena_blaster.glb")
    build_arena(out_glb)
