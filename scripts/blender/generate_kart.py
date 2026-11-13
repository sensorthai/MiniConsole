import bpy
import math
import os
import sys

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_material(name, color, metallic=0.8, roughness=0.2, emission=None, emission_strength=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs['Base Color'].default_value = color
        bsdf.inputs['Metallic'].default_value = metallic
        bsdf.inputs['Roughness'].default_value = roughness
        if emission:
            if 'Emission Color' in bsdf.inputs:
                bsdf.inputs['Emission Color'].default_value = emission
                bsdf.inputs['Emission Strength'].default_value = emission_strength
            elif 'Emission' in bsdf.inputs:
                bsdf.inputs['Emission'].default_value = emission
    return mat

def build_cyber_kart(output_path):
    clear_scene()

    # Materials
    mat_cyan_body  = create_material("CyanCarbon", (0.0, 0.85, 1.0, 1.0), metallic=0.9, roughness=0.15)
    mat_dark_frame = create_material("ChassisDark", (0.04, 0.05, 0.08, 1.0), metallic=0.9, roughness=0.25)
    mat_rubber     = create_material("TireRubber", (0.02, 0.02, 0.02, 1.0), metallic=0.0, roughness=0.85)
    mat_neon_rim   = create_material("NeonRim", (1.0, 0.16, 0.43, 1.0), metallic=0.8, roughness=0.2, emission=(1.0, 0.16, 0.43, 1.0), emission_strength=4.0)
    mat_headlight  = create_material("HeadlightGlow", (1.0, 1.0, 1.0, 1.0), metallic=0.1, roughness=0.05, emission=(1.0, 1.0, 1.0, 1.0), emission_strength=8.0)
    mat_windshield = create_material("Windshield", (0.05, 0.15, 0.25, 0.6), metallic=0.1, roughness=0.05)

    # 1. Main Chassis Frame
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0.35))
    chassis = bpy.context.active_object
    chassis.name = "Chassis"
    chassis.scale = (1.5, 3.4, 0.3)
    chassis.data.materials.append(mat_cyan_body)

    # 2. Aerodynamic Cockpit & Hood
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.6, depth=2.0, location=(0, -0.2, 0.65))
    cockpit = bpy.context.active_object
    cockpit.name = "CockpitBody"
    cockpit.rotation_euler = (math.radians(90), 0, 0)
    cockpit.scale = (1.1, 0.6, 1.2)
    cockpit.data.materials.append(mat_dark_frame)

    # Windshield Glass
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0.4, 0.95))
    windshield = bpy.context.active_object
    windshield.name = "Windshield"
    windshield.scale = (0.9, 0.4, 0.35)
    windshield.rotation_euler = (math.radians(-35), 0, 0)
    windshield.data.materials.append(mat_windshield)

    # 3. Front Bumper / Splitter
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 1.85, 0.2))
    splitter = bpy.context.active_object
    splitter.name = "FrontSplitter"
    splitter.scale = (1.9, 0.6, 0.12)
    splitter.data.materials.append(mat_dark_frame)

    # Dual Headlights
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.14, depth=0.15, location=(side * 0.7, 1.85, 0.38))
        light = bpy.context.active_object
        light.name = f"Headlight_{'L' if side < 0 else 'R'}"
        light.rotation_euler = (math.radians(90), 0, 0)
        light.data.materials.append(mat_headlight)

    # 4. Rear Spoiler (GT Wing)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, -1.8, 1.15))
    wing = bpy.context.active_object
    wing.name = "RearWing"
    wing.scale = (2.1, 0.55, 0.08)
    wing.rotation_euler = (math.radians(10), 0, 0)
    wing.data.materials.append(mat_cyan_body)

    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side * 0.65, -1.75, 0.75))
        strut = bpy.context.active_object
        strut.name = f"WingStrut_{'L' if side < 0 else 'R'}"
        strut.scale = (0.06, 0.15, 0.65)
        strut.data.materials.append(mat_dark_frame)

    # 5. 4 Wheels (Tires + Neon Alloy Rims)
    wheel_positions = [
        ("FL", -1.05, 1.2, 0.45),
        ("FR",  1.05, 1.2, 0.45),
        ("RL", -1.15, -1.2, 0.52),
        ("RR",  1.15, -1.2, 0.52)
    ]
    for name, x, y, z in wheel_positions:
        # Tire
        radius = 0.52 if "R" in name else 0.45
        bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=radius, depth=0.36, location=(x, y, z))
        tire = bpy.context.active_object
        tire.name = f"Tire_{name}"
        tire.rotation_euler = (0, math.radians(90), 0)
        tire.data.materials.append(mat_rubber)

        # Rim Hub + Neon Ring
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=radius * 0.65, depth=0.38, location=(x + (0.02 if x > 0 else -0.02), y, z))
        rim = bpy.context.active_object
        rim.name = f"Rim_{name}"
        rim.rotation_euler = (0, math.radians(90), 0)
        rim.data.materials.append(mat_neon_rim)

    bpy.ops.object.select_all(action='SELECT')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True
    )
    print(f"SUCCESS: Exported Cyber Kart model to {output_path}")

if __name__ == '__main__':
    out_file = sys.argv[-1] if len(sys.argv) > 1 and sys.argv[-1].endswith('.glb') else '/tmp/cyber_kart.glb'
    build_cyber_kart(out_file)
