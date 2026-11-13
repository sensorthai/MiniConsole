import bpy
import math
import os
import sys

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def create_material(name, color, metallic=0.9, roughness=0.2, emission=None, emission_strength=1.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    
    if bsdf:
        bsdf.inputs['Base Color'].default_value = color
        bsdf.inputs['Metallic'].default_value = metallic
        bsdf.inputs['Roughness'].default_value = roughness
        if emission:
            # Blender 4+ / 5+ uses Emission Color and Emission Strength
            if 'Emission Color' in bsdf.inputs:
                bsdf.inputs['Emission Color'].default_value = emission
                bsdf.inputs['Emission Strength'].default_value = emission_strength
            elif 'Emission' in bsdf.inputs:
                bsdf.inputs['Emission'].default_value = emission
    return mat

def build_cyber_fighter(output_path):
    clear_scene()

    # Materials
    mat_dark_armor = create_material("DarkArmor", (0.05, 0.07, 0.12, 1.0), metallic=0.95, roughness=0.18)
    mat_cyan_glow  = create_material("CyanGlow", (0.0, 0.9, 1.0, 1.0), metallic=0.1, roughness=0.1, emission=(0.0, 0.95, 1.0, 1.0), emission_strength=5.0)
    mat_gold_trim  = create_material("GoldTrim", (1.0, 0.75, 0.1, 1.0), metallic=0.9, roughness=0.25)
    mat_thruster   = create_material("ThrusterPlasma", (1.0, 0.15, 0.4, 1.0), metallic=0.0, roughness=0.1, emission=(1.0, 0.2, 0.5, 1.0), emission_strength=8.0)
    mat_cockpit    = create_material("GlassCockpit", (0.02, 0.2, 0.35, 1.0), metallic=0.2, roughness=0.05)

    # 1. Main Fuselage (Arrowhead stealth body)
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.65, depth=4.2, location=(0, 0, 0))
    fuselage = bpy.context.active_object
    fuselage.name = "Fuselage"
    fuselage.rotation_euler = (math.radians(90), 0, 0)
    fuselage.scale = (1.1, 0.45, 1.0)
    fuselage.data.materials.append(mat_dark_armor)

    # 2. Nose Cone (Needle/Stealth sharp front)
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=0.65, depth=2.0, location=(0, 2.8, 0))
    nose = bpy.context.active_object
    nose.name = "NoseCone"
    nose.rotation_euler = (math.radians(-90), 0, 0)
    nose.scale = (1.1, 0.45, 1.0)
    nose.data.materials.append(mat_dark_armor)

    # 3. Cockpit Canopy
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, radius=0.45, location=(0, 0.6, 0.28))
    cockpit = bpy.context.active_object
    cockpit.name = "Cockpit"
    cockpit.scale = (0.75, 2.2, 0.45)
    cockpit.data.materials.append(mat_cockpit)

    # 4. Swept Forward Wings (Left & Right)
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side * 1.8, -0.4, 0))
        wing = bpy.context.active_object
        wing.name = f"Wing_{'L' if side < 0 else 'R'}"
        wing.scale = (1.8, 1.2, 0.06)
        wing.rotation_euler = (0, math.radians(side * -8), math.radians(side * 28))
        wing.data.materials.append(mat_dark_armor)

        # Wingtip Plasma Blade (Glowing edge)
        bpy.ops.mesh.primitive_cylinder_add(vertices=4, radius=0.08, depth=2.2, location=(side * 2.8, -0.2, 0))
        blade = bpy.context.active_object
        blade.name = f"WingBlade_{'L' if side < 0 else 'R'}"
        blade.rotation_euler = (math.radians(90), 0, math.radians(side * 25))
        blade.scale = (0.4, 1.0, 1.0)
        blade.data.materials.append(mat_cyan_glow)

        # Twin Heavy Canons
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.08, depth=1.8, location=(side * 1.1, 1.0, -0.1))
        canon = bpy.context.active_object
        canon.name = f"Canon_{'L' if side < 0 else 'R'}"
        canon.rotation_euler = (math.radians(90), 0, 0)
        canon.data.materials.append(mat_gold_trim)

    # 5. Dual Plasma Thrusters (Rear)
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.32, depth=0.9, location=(side * 0.45, -2.1, 0.05))
        exhaust_ring = bpy.context.active_object
        exhaust_ring.name = f"ExhaustRing_{'L' if side < 0 else 'R'}"
        exhaust_ring.rotation_euler = (math.radians(90), 0, 0)
        exhaust_ring.data.materials.append(mat_dark_armor)

        bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.25, radius2=0.1, depth=0.6, location=(side * 0.45, -2.3, 0.05))
        flame = bpy.context.active_object
        flame.name = f"PlasmaFlame_{'L' if side < 0 else 'R'}"
        flame.rotation_euler = (math.radians(-90), 0, 0)
        flame.data.materials.append(mat_thruster)

    # 6. Twin Vertical Stabilizers (V-Tail)
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(side * 0.65, -1.6, 0.65))
        tail = bpy.context.active_object
        tail.name = f"TailFin_{'L' if side < 0 else 'R'}"
        tail.scale = (0.05, 0.8, 0.75)
        tail.rotation_euler = (math.radians(-15), math.radians(side * 25), 0)
        tail.data.materials.append(mat_dark_armor)

    # Select all and join into a single root mesh or export scene
    bpy.ops.object.select_all(action='SELECT')
    
    # Export to GLTF/GLB
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=True,
        export_apply=True
    )
    print(f"SUCCESS: Exported Cyber Fighter model to {output_path}")

if __name__ == '__main__':
    out_file = sys.argv[-1] if len(sys.argv) > 1 and sys.argv[-1].endswith('.glb') else '/tmp/cyber_fighter.glb'
    build_cyber_fighter(out_file)
