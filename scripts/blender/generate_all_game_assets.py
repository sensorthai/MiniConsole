import bpy
import math
import os
import sys

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_mat(name, base_color, metallic=0.85, roughness=0.2, emission=None, emission_strength=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = base_color
        bsdf.inputs['Metallic'].default_value = metallic
        bsdf.inputs['Roughness'].default_value = roughness
        if emission:
            if 'Emission Color' in bsdf.inputs:
                bsdf.inputs['Emission Color'].default_value = emission
                bsdf.inputs['Emission Strength'].default_value = emission_strength
            elif 'Emission' in bsdf.inputs:
                bsdf.inputs['Emission'].default_value = emission
    return mat

def export_glb(filepath):
    bpy.ops.object.select_all(action='SELECT')
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=True,
        export_apply=True
    )
    print(f"[BLENDER] Exported: {filepath}")

# ==============================================================================
# 1. GIANT CYBER-ZOMBIE BOSS (บอสซอมบี้จักรกลขนาดยักษ์)
# ==============================================================================
def build_zombie_boss(out_path):
    clear_scene()
    mat_skin   = create_mat("MutantSkin", (0.12, 0.28, 0.14, 1.0), metallic=0.2, roughness=0.65)
    mat_armor  = create_mat("BioArmor", (0.08, 0.09, 0.12, 1.0), metallic=0.92, roughness=0.25)
    mat_toxic  = create_mat("ToxicCore", (0.2, 1.0, 0.1, 1.0), metallic=0.1, roughness=0.1, emission=(0.2, 1.0, 0.15, 1.0), emission_strength=8.0)
    mat_crimson = create_mat("RageEyes", (1.0, 0.05, 0.2, 1.0), metallic=0.1, roughness=0.1, emission=(1.0, 0.08, 0.2, 1.0), emission_strength=10.0)

    # Massive Hulking Torso (Y-up in Three.js -> Z-up in Blender, GLTF exporter converts Z-up to Y-up automatically!)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.25, location=(0, 0, 2.3))
    torso = bpy.context.active_object
    torso.scale = (1.35, 0.95, 1.15)
    torso.data.materials.append(mat_skin)

    # Glowing Mutagen Chest Core
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, radius=0.52, location=(0, 0.85, 2.35))
    core = bpy.context.active_object
    core.data.materials.append(mat_toxic)

    # Chest Armor Ribs
    for i in range(3):
        bpy.ops.mesh.primitive_torus_add(major_radius=1.15, minor_radius=0.1, location=(0, 0.1, 1.9 + i * 0.4))
        rib = bpy.context.active_object
        rib.scale = (1.2, 0.85, 0.6)
        rib.data.materials.append(mat_armor)

    # Armored Head + Glowing Rage Visor + Horns
    bpy.ops.mesh.primitive_cube_add(size=0.95, location=(0, 0.25, 3.65))
    head = bpy.context.active_object
    head.data.materials.append(mat_armor)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.72, 3.68))
    visor = bpy.context.active_object
    visor.scale = (0.75, 0.12, 0.22)
    visor.data.materials.append(mat_crimson)

    # Dorsal Toxic Spines / Tanks on Back
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.38, depth=1.6, location=(side * 0.6, -0.75, 2.6))
        tank = bpy.context.active_object
        tank.rotation_euler = (math.radians(-20), 0, 0)
        tank.data.materials.append(mat_toxic)

        # Giant Shoulder Pauldrons with Spikes
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.8, location=(side * 1.65, 0, 2.85))
        pauldron = bpy.context.active_object
        pauldron.scale = (1.1, 0.9, 0.8)
        pauldron.data.materials.append(mat_armor)

        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.25, depth=0.9, location=(side * 2.1, 0, 3.45))
        spike = bpy.context.active_object
        spike.rotation_euler = (0, math.radians(side * 35), 0)
        spike.data.materials.append(mat_crimson)

        # Hulking Arms & Cyber Crusher Claws
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.45, depth=1.8, location=(side * 1.95, 0.35, 1.85))
        arm = bpy.context.active_object
        arm.rotation_euler = (math.radians(25), 0, 0)
        arm.data.materials.append(mat_skin)

        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.65, location=(side * 2.0, 0.75, 1.05))
        fist = bpy.context.active_object
        fist.data.materials.append(mat_armor)

        # Heavy Pillar Legs
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.48, depth=1.5, location=(side * 0.7, 0, 0.75))
        leg = bpy.context.active_object
        leg.data.materials.append(mat_armor)

    export_glb(out_path)

# ==============================================================================
# 2. NEON STADIUM & TRACK ENVIRONMENT ARCH (ซุ้มสนามแข่งและเสาไฟนีออน)
# ==============================================================================
def build_track_environment(out_path):
    clear_scene()
    mat_frame = create_mat("ArchSteel", (0.06, 0.08, 0.14, 1.0), metallic=0.9, roughness=0.2)
    mat_cyan  = create_mat("NeonCyan", (0.0, 0.95, 1.0, 1.0), metallic=0.2, roughness=0.1, emission=(0.0, 0.95, 1.0, 1.0), emission_strength=6.0)
    mat_pink  = create_mat("NeonPink", (1.0, 0.15, 0.45, 1.0), metallic=0.2, roughness=0.1, emission=(1.0, 0.15, 0.45, 1.0), emission_strength=6.0)
    mat_gold  = create_mat("NeonGold", (1.0, 0.75, 0.05, 1.0), metallic=0.3, roughness=0.1, emission=(1.0, 0.75, 0.05, 1.0), emission_strength=5.0)

    # Left & Right Cyber Pylon Towers (Span width = 26m for wide track)
    for side in [-1, 1]:
        x = side * 13.0
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=1.1, depth=12.0, location=(x, 0, 6.0))
        tower = bpy.context.active_object
        tower.data.materials.append(mat_frame)

        # Glowing Energy Rings around Tower
        for h in [2.5, 5.5, 8.5, 11.0]:
            bpy.ops.mesh.primitive_torus_add(major_radius=1.25, minor_radius=0.12, location=(x, 0, h))
            ring = bpy.context.active_object
            ring.data.materials.append(mat_cyan if int(h) % 2 == 0 else mat_pink)

        # Angled Support Struts
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side * 10.5, 0, 10.2))
        strut = bpy.context.active_object
        strut.scale = (3.5, 0.6, 0.6)
        strut.rotation_euler = (0, math.radians(side * -28), 0)
        strut.data.materials.append(mat_frame)

    # Overhead Holographic Bridge Gantry
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 11.8))
    bridge = bpy.context.active_object
    bridge.scale = (28.0, 1.4, 1.2)
    bridge.data.materials.append(mat_frame)

    # Neon Strip Banner on Bridge
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.78, 11.8))
    banner_front = bpy.context.active_object
    banner_front.scale = (24.0, 0.1, 0.55)
    banner_front.data.materials.append(mat_cyan)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -0.78, 11.8))
    banner_back = bpy.context.active_object
    banner_back.scale = (24.0, 0.1, 0.55)
    banner_back.data.materials.append(mat_pink)

    # Floating Cyber Drones / Spotlights above Arch
    for side in [-1, 0, 1]:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.2, location=(side * 7.5, 0, 14.2))
        gem = bpy.context.active_object
        gem.data.materials.append(mat_gold if side == 0 else mat_cyan)

    export_glb(out_path)

# ==============================================================================
# 3. SPECIAL POWER-UP ITEMS FOR ALL 5 GAMES (ไอเทมพิเศษของทุกเกม)
# ==============================================================================

# Game 1 (Kart Racing): Hyper Nitro Mystery Crystal Box
def build_item_kart(out_path):
    clear_scene()
    mat_frame = create_mat("GoldFrame", (1.0, 0.78, 0.1, 1.0), metallic=0.95, roughness=0.15, emission=(1.0, 0.7, 0.0, 1.0), emission_strength=2.5)
    mat_core  = create_mat("CyanCrystal", (0.0, 0.95, 1.0, 1.0), metallic=0.1, roughness=0.05, emission=(0.0, 0.95, 1.0, 1.0), emission_strength=7.0)
    mat_ring  = create_mat("MagentaRing", (1.0, 0.15, 0.5, 1.0), metallic=0.5, roughness=0.1, emission=(1.0, 0.15, 0.5, 1.0), emission_strength=5.0)

    # Inner Star Core
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.55, location=(0, 0, 0))
    core = bpy.context.active_object
    core.data.materials.append(mat_core)

    # Gyro Rings
    bpy.ops.mesh.primitive_torus_add(major_radius=0.82, minor_radius=0.07, location=(0, 0, 0))
    r1 = bpy.context.active_object
    r1.rotation_euler = (math.radians(45), 0, 0)
    r1.data.materials.append(mat_frame)

    bpy.ops.mesh.primitive_torus_add(major_radius=0.92, minor_radius=0.06, location=(0, 0, 0))
    r2 = bpy.context.active_object
    r2.rotation_euler = (0, math.radians(45), 0)
    r2.data.materials.append(mat_ring)

    export_glb(out_path)

# Game 2 (Arena Blaster): Overdrive Plasma Cannon & Shield Core
def build_item_blaster(out_path):
    clear_scene()
    mat_tech  = create_mat("TechMetal", (0.1, 0.12, 0.18, 1.0), metallic=0.9, roughness=0.2)
    mat_laser = create_mat("CrimsonLaser", (1.0, 0.1, 0.3, 1.0), metallic=0.2, roughness=0.1, emission=(1.0, 0.1, 0.35, 1.0), emission_strength=8.0)
    mat_cyan  = create_mat("ShieldBlue", (0.0, 0.85, 1.0, 1.0), metallic=0.2, roughness=0.1, emission=(0.0, 0.85, 1.0, 1.0), emission_strength=6.0)

    # Central Plasma Capsule
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.42, depth=1.3, location=(0, 0, 0))
    cell = bpy.context.active_object
    cell.data.materials.append(mat_laser)

    # End Caps
    for z in [-0.65, 0.65]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.52, depth=0.2, location=(0, 0, z))
        cap = bpy.context.active_object
        cap.data.materials.append(mat_tech)

    # Orbiting Shield Plates
    for i in range(3):
        ang = i * (2 * math.pi / 3)
        bpy.ops.mesh.primitive_cube_add(size=0.35, location=(math.cos(ang)*0.75, math.sin(ang)*0.75, 0))
        plate = bpy.context.active_object
        plate.scale = (0.4, 1.2, 2.2)
        plate.rotation_euler = (0, 0, ang)
        plate.data.materials.append(mat_cyan)

    export_glb(out_path)

# Game 3 (Sumo Mech): Super Shockwave Gravity Hammer / Gyro Booster
def build_item_sumo(out_path):
    clear_scene()
    mat_gold  = create_mat("SolarGold", (1.0, 0.72, 0.0, 1.0), metallic=0.9, roughness=0.15, emission=(1.0, 0.65, 0.0, 1.0), emission_strength=6.0)
    mat_heavy = create_mat("HeavyIron", (0.12, 0.12, 0.15, 1.0), metallic=0.95, roughness=0.2)

    # Gravity Core Sphere
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, radius=0.55, location=(0, 0, 0))
    sphere = bpy.context.active_object
    sphere.data.materials.append(mat_gold)

    # Heavy Impact Bumper Ring with Ramming Spikes
    bpy.ops.mesh.primitive_torus_add(major_radius=0.88, minor_radius=0.16, location=(0, 0, 0))
    ring = bpy.context.active_object
    ring.data.materials.append(mat_heavy)

    for i in range(6):
        ang = i * (math.pi / 3)
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.2, depth=0.5, location=(math.cos(ang)*1.08, math.sin(ang)*1.08, 0))
        spike = bpy.context.active_object
        spike.rotation_euler = (0, math.radians(90), ang)
        spike.data.materials.append(mat_gold)

    export_glb(out_path)

# Game 4 (Rocket Soccer): Supersonic Twin-Turbo Boost Canister
def build_item_soccer(out_path):
    clear_scene()
    mat_emerald = create_mat("EmeraldBoost", (0.02, 1.0, 0.6, 1.0), metallic=0.3, roughness=0.1, emission=(0.02, 1.0, 0.6, 1.0), emission_strength=7.0)
    mat_chrome  = create_mat("ChromeTank", (0.8, 0.85, 0.9, 1.0), metallic=0.98, roughness=0.1)
    mat_flame   = create_mat("NitroFlame", (1.0, 0.45, 0.0, 1.0), metallic=0.1, roughness=0.1, emission=(1.0, 0.4, 0.0, 1.0), emission_strength=9.0)

    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.32, depth=1.2, location=(side * 0.36, 0, 0.1))
        tank = bpy.context.active_object
        tank.data.materials.append(mat_chrome)

        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.32, location=(side * 0.36, 0, 0.7))
        dome = bpy.context.active_object
        dome.data.materials.append(mat_emerald)

        bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.26, depth=0.55, location=(side * 0.36, 0, -0.65))
        nozzle = bpy.context.active_object
        nozzle.rotation_euler = (math.radians(180), 0, 0)
        nozzle.data.materials.append(mat_flame)

    # Connecting Harness
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.15))
    band = bpy.context.active_object
    band.scale = (0.95, 0.45, 0.3)
    band.data.materials.append(mat_emerald)

    export_glb(out_path)

# Game 5 (Zombie Defense): Quantum Reactor Overcharge & Nuke Crate
def build_item_zombie(out_path):
    clear_scene()
    mat_crate = create_mat("MilCrate", (0.08, 0.14, 0.1, 1.0), metallic=0.85, roughness=0.3)
    mat_nuke  = create_mat("NukeGold", (1.0, 0.85, 0.0, 1.0), metallic=0.4, roughness=0.1, emission=(1.0, 0.8, 0.0, 1.0), emission_strength=8.0)
    mat_heal  = create_mat("NanoEmerald", (0.0, 1.0, 0.5, 1.0), metallic=0.2, roughness=0.1, emission=(0.0, 1.0, 0.5, 1.0), emission_strength=7.0)

    # Armored Octagonal Supply Pod
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.65, depth=0.9, location=(0, 0, 0))
    pod = bpy.context.active_object
    pod.data.materials.append(mat_crate)

    # Glowing Energy Cross on Top & Sides
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
    c1 = bpy.context.active_object
    c1.scale = (1.38, 0.28, 0.55)
    c1.data.materials.append(mat_heal)

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
    c2 = bpy.context.active_object
    c2.scale = (0.28, 1.38, 0.55)
    c2.data.materials.append(mat_heal)

    # Floating Nuke Core Crystal Above Pod
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.42, location=(0, 0, 0.85))
    beacon = bpy.context.active_object
    beacon.data.materials.append(mat_nuke)

    export_glb(out_path)

if __name__ == '__main__':
    out_dir = sys.argv[-1] if len(sys.argv) > 1 and not sys.argv[-1].endswith('.py') else '/Users/tinshunijtanakun/Documents/Antigravity/Online Game/public/models'
    os.makedirs(out_dir, exist_ok=True)

    build_zombie_boss(os.path.join(out_dir, 'zombie_boss.glb'))
    build_track_environment(os.path.join(out_dir, 'track_arch.glb'))
    build_item_kart(os.path.join(out_dir, 'item_kart.glb'))
    build_item_blaster(os.path.join(out_dir, 'item_blaster.glb'))
    build_item_sumo(os.path.join(out_dir, 'item_sumo.glb'))
    build_item_soccer(os.path.join(out_dir, 'item_soccer.glb'))
    build_item_zombie(os.path.join(out_dir, 'item_zombie.glb'))
    print("ALL_BLENDER_MODELS_GENERATED_SUCCESSFULLY")
