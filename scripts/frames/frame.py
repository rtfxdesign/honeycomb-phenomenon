"""Render a flat-top hexagonal cell frame for the Honeycomb comb.

Real geometry, real lighting (Cycles): a profile is swept round a hexagon,
one strip per side so the corners stay crisp, lit by a studio of soft boxes
and rendered straight down with an orthographic camera onto a transparent
film. A shadow catcher under the frame keeps the shadow the frame throws
inward, onto the face that sits beneath it in the page.

Units are pixels of the 548-wide cell image: outer circumradius 274.
The opening is 0.80 of that, a little inside the face (which starts at 9%
inset, i.e. 0.82), so the frame's lip overlaps the photo like a mount.

usage: python frame.py <variant> <out.png> [samples]
variant: team | story | rice
"""
import sys, math
import bpy, bmesh
from mathutils import Vector

variant = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else sys.argv[1]
out = sys.argv[-2] if sys.argv[-1].isdigit() else sys.argv[-1]
samples = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 96

R = 274.0
A0 = R * math.sqrt(3) / 2          # outer apothem
A1 = 0.80 * R * math.sqrt(3) / 2   # opening apothem
BAND = A0 - A1                     # ~47.5 px

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ── materials ────────────────────────────────────────────────────────────────
def srgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c) + (1.0,)

def metal(name, color, rough, aniso=0.0, bump=0.0, bump_scale=6.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = color
    b.inputs['Metallic'].default_value = 1.0
    b.inputs['Roughness'].default_value = rough
    if aniso:
        b.inputs['Anisotropic'].default_value = aniso
    if bump:
        tex = nt.nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value = bump_scale
        tex.inputs['Detail'].default_value = 8.0
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump
        bp.inputs['Distance'].default_value = 0.6
        nt.links.new(tex.outputs['Fac'], bp.inputs['Height'])
        nt.links.new(bp.outputs['Normal'], b.inputs['Normal'])
    return m

def enamel(name, color):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = color
    b.inputs['Metallic'].default_value = 0.0
    b.inputs['Roughness'].default_value = 0.5
    b.inputs['Coat Weight'].default_value = 0.45
    b.inputs['Coat Roughness'].default_value = 0.12
    return m

GOLD = srgb('#F4C25A')
gold_polish = metal('gold_polish', GOLD, 0.16, bump=0.05, bump_scale=0.08)
gold_bead = metal('gold_bead', srgb('#FFD36E'), 0.12)
gold_satin = metal('gold_satin', srgb('#C99A4A'), 0.42, aniso=0.6, bump=0.08, bump_scale=0.25)
silver = metal('silver', srgb('#E6E8EC'), 0.14)
navy = enamel('navy', srgb('#00205B'))

# ── a profile swept round the hexagon ────────────────────────────────────────
# profile: list of (inset from the outer edge, height, material index)
def hex_dir(i):
    a = math.radians(60 * i)
    return Vector((math.cos(a), math.sin(a), 0))

def sweep(name, profile, mats):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    for side in range(6):
        # side between corner `side` and `side+1`; corners of a hex of apothem a
        # sit at a / cos(30°) along the corner direction
        c0, c1 = hex_dir(side), hex_dir(side + 1)
        rows = []
        for (d, z, _) in profile:
            r = (A0 - d) / math.cos(math.radians(30))
            v0 = bm.verts.new((c0 * r).to_tuple()[:2] + (z,))
            v1 = bm.verts.new((c1 * r).to_tuple()[:2] + (z,))
            rows.append((v0, v1))
        for i in range(len(rows) - 1):
            a0, a1 = rows[i]; b0, b1 = rows[i + 1]
            f = bm.faces.new((a0, a1, b1, b0))
            f.material_index = profile[i][2]
            f.smooth = True
    bm.normal_update()
    bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(m)
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    # faces must point up/out for the shading to read correctly
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
    return ob

def beads(radius, apothem, z, spacing, mat):
    """a string of small spheres laid along a hexagon"""
    me_src = bpy.data.meshes.new('bead')
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=radius)
    for f in bm.faces: f.smooth = True
    bm.to_mesh(me_src); bm.free(); me_src.materials.append(mat)
    r = apothem / math.cos(math.radians(30))
    for side in range(6):
        c0, c1 = hex_dir(side) * r, hex_dir(side + 1) * r
        L = (c1 - c0).length; n = max(1, int(L // spacing))
        for k in range(n):
            p = c0 + (c1 - c0) * ((k + 0.5) / n)
            ob = bpy.data.objects.new('bead', me_src); ob.location = (p.x, p.y, z)
            scene.collection.objects.link(ob)

B = BAND
if variant == 'team':
    # rounded outer roll, a raised ridge, an engraved groove, a string of
    # beads, then a polished inner bevel down into the opening
    prof = [(0, 0, 0), (0.6, 4, 0), (1.8, 7.5, 0), (3.6, 10, 0), (6, 11.5, 0), (9, 12, 0)]
    prof += [(11, 11.6, 0), (13, 10.6, 0), (15, 13.5, 0), (17, 15, 0), (19, 13.5, 0), (21, 10.2, 0)]  # ridge
    prof += [(22.2, 7.5, 0), (23.4, 7.2, 0), (24.6, 9.8, 0)]                                           # groove
    prof += [(26, 10.4, 0), (35, 10.4, 0)]                                                              # bead seat
    prof += [(37, 10.2, 0), (40, 8.5, 0), (43, 6, 0), (45.5, 3.6, 0), (B - 0.6, 1.2, 0), (B, 0, 0)]  # inner bevel
    sweep('frame', prof, [gold_polish])
    beads(3.1, A0 - 30.5, 12.2, 8.2, gold_bead)
elif variant == 'story':
    # one quiet chamfer and a flat satin band
    prof = [(0, 0, 0), (1.2, 4, 0), (3.5, 7, 0), (7, 8.4, 0), (10, 8.8, 0), (37, 8.8, 0),
            (40, 8.2, 0), (43.5, 5.5, 0), (B - 0.8, 1.6, 0), (B, 0, 0)]
    sweep('frame', prof, [gold_satin])
elif variant == 'rice':
    # polished silver rim, a recessed band of navy enamel, a silver inner lip
    prof = [(0, 0, 0), (0.7, 4.5, 0), (2.2, 8.5, 0), (4.5, 11, 0), (7.5, 11.8, 0), (10.5, 11, 0),
            (12.5, 9, 0), (13.4, 7.4, 0), (14, 7.0, 1), (34, 7.0, 0), (34.6, 7.4, 0), (36, 9.6, 0),
            (38.5, 10.4, 0), (41, 9.4, 0), (43.5, 6.5, 0), (B - 0.7, 1.6, 0), (B, 0, 0)]
    sweep('frame', prof, [silver, navy])
else:
    raise SystemExit('variant: team | story | rice')

# ── the face plane: catches the frame's shadow, invisible otherwise ──────────
# only inside the opening (and a hair under the lip): a shadow thrown outside
# the cell would land on its neighbours in the page
cm = bpy.data.meshes.new('catcher'); bm = bmesh.new()
rc = (A1 + 3) / math.cos(math.radians(30))
vs = [bm.verts.new(((hex_dir(i) * rc).x, (hex_dir(i) * rc).y, -0.3)) for i in range(6)]
bm.faces.new(vs); bm.to_mesh(cm); bm.free()
catcher = bpy.data.objects.new('catcher', cm); scene.collection.objects.link(catcher)
catcher.is_shadow_catcher = True

# ── a small studio ───────────────────────────────────────────────────────────
def softbox(name, loc, size, energy, color=(1, 0.96, 0.9)):
    L = bpy.data.lights.new(name, 'AREA'); L.size = size; L.energy = energy; L.color = color
    ob = bpy.data.objects.new(name, L); ob.location = loc
    scene.collection.objects.link(ob)
    d = Vector((0, 0, 0)) - Vector(loc); ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return ob

# key from the upper left, as the comb's own light reads; fill from the right;
# a broad overhead box so the flat tops have something to reflect
softbox('key', (-900, 700, 900), 420, 8.0e6)
softbox('fill', (1000, -300, 500), 900, 2.2e6, (1, 0.9, 0.8))
softbox('top', (-250, 250, 1600), 1500, 9.0e6)
softbox('rim', (200, 1100, 250), 500, 1.8e6)

world = bpy.data.worlds.new('w'); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.012, 0.008, 0.005, 1); bg.inputs['Strength'].default_value = 1.0

# ── camera straight down, orthographic, framing the hexagon exactly ──────────
cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = 2 * R
co = bpy.data.objects.new('cam', cam); co.location = (0, 0, 1000); scene.collection.objects.link(co)
scene.camera = co
scene.render.resolution_x = 1096
scene.render.resolution_y = round(1096 * math.sqrt(3) / 2)
scene.render.film_transparent = True
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = samples
scene.cycles.use_denoising = True
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.filepath = out
bpy.ops.render.render(write_still=True)
print('wrote', out)
