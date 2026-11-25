import bpy, sys, os
from mathutils import Matrix
args=sys.argv[sys.argv.index('--')+1:]
CH=args[0]; OUT=args[1]
s=bpy.context.scene
s.render.fps=30; s.render.fps_base=1
# include every collection in the view layer
def unexclude(lc):
    lc.exclude=False; lc.hide_viewport=False
    for c in lc.children: unexclude(c)
unexclude(bpy.context.view_layer.layer_collection)
for c in bpy.data.collections: c.hide_viewport=False; c.hide_select=False
def subtree(o,acc):
    acc.add(o)
    for c in o.children: subtree(c,acc)
CFG={
 'BLACKDOT':{'pos':'POS_BLACKDOT','rig':'Rig_BLACKDOT','tracks':[('Coreografia','BD_Skate_Keyframes',151,420),('Presentacion_Alterna','ACC_Rig_BLACKDOT',1,840)]},
 'KAIRO':{'pos':'POS_KAIRO','rig':'Rig_KAIRO','tracks':[('Coreografia','ACC_Rig_KAIRO',1,715)]},
 'NOX':{'pos':'POS_NOX','rig':'Rig_NOX','tracks':[('Coreografia','NOX_Keyframes',720,905),('Coreografia_Alterna','ACC_Rig_NOX',1,840)]},
}[CH]
pos=bpy.data.objects[CFG['pos']]; rig=bpy.data.objects[CFG['rig']]
keep=set(); subtree(pos,keep)
def add_strip(obj, tname, act, a0, a1):
    ad=obj.animation_data or obj.animation_data_create()
    tr=None
    for t in ad.nla_tracks:
        if t.name==tname: tr=t
    if tr is None:
        tr=ad.nla_tracks.new(); tr.name=tname
    st=tr.strips.new(tname, 1, act)
    try:
        if len(act.slots): st.action_slot=act.slots[0]
    except Exception as e: print('slot err',e)
    st.action_frame_start=a0; st.action_frame_end=a1
    st.frame_start=1; st.frame_end=1+(a1-a0)
    st.extrapolation='NOTHING'
    print('STRIP',obj.name,tname,act.name,st.frame_start,st.frame_end,st.action_frame_start,st.action_frame_end)
    return st
katana=set()
if CH=='KAIRO':
    raiz=bpy.data.objects['KAIRO_Katana_Raiz']
    subtree(raiz,katana)
    a0,a1=1,715
    mats=[]
    for f in range(a0,a1+1):
        s.frame_set(f); mats.append(raiz.matrix_world.copy())
    # detach from turntable and constraint, bake visual transform under POS_KAIRO (static)
    for c in list(raiz.constraints): raiz.constraints.remove(c)
    if raiz.animation_data: raiz.animation_data.action=None
    raiz.parent=pos; raiz.matrix_parent_inverse=Matrix.Identity(4)
    raiz.rotation_mode='QUATERNION'
    act=bpy.data.actions.new('KAIRO_Katana_Bake')
    raiz.animation_data_create(); raiz.animation_data.action=act
    pinv=pos.matrix_world.inverted()
    prevq=None
    for i,f in enumerate(range(a0,a1+1)):
        m=pinv@mats[i]
        loc,rot,sca=m.decompose()
        if prevq is not None and prevq.dot(rot)<0: rot.negate()
        prevq=rot.copy()
        raiz.location=loc; raiz.rotation_quaternion=rot; raiz.scale=sca
        for p in ('location','rotation_quaternion','scale'): raiz.keyframe_insert(p, frame=f)
    raiz.animation_data.action=None
    keep|=katana
    add_strip(raiz,'Coreografia',act,a0,a1)
# rig NLA
ad=rig.animation_data
ad.action=None
for t in list(ad.nla_tracks): ad.nla_tracks.remove(t)
for tname,actname,a0,a1 in CFG['tracks']:
    add_strip(rig,tname,bpy.data.actions[actname],a0,a1)
# other kept objects: clear stray actions (lights etc.)
for o in keep:
    if o not in (rig,) and o.name!='KAIRO_Katana_Raiz' and o.animation_data:
        o.animation_data.action=None
        for t in list(o.animation_data.nla_tracks): o.animation_data.nla_tracks.remove(t)
# downscale textures used by kept materials
imgs=set()
for o in keep:
    if o.type=='MESH':
        for ms in o.material_slots:
            m=ms.material
            if m and m.node_tree:
                for n in m.node_tree.nodes:
                    if n.type=='TEX_IMAGE' and n.image: imgs.add(n.image)
for im in imgs:
    w,h=im.size
    if max(w,h)>2048:
        k=2048/max(w,h); im.scale(int(w*k),int(h*k)); print('SCALED',im.name,w,h,'->',im.size[:])
    else: print('IMG',im.name,w,h)
# selection
bpy.ops.object.select_all(action='DESELECT') if bpy.context.view_layer.objects.active else None
for o in bpy.context.view_layer.objects: o.select_set(False)
for o in keep:
    o.hide_set(False); o.hide_viewport=False
    try: o.select_set(True)
    except Exception as e: print('SELERR',o.name,e)
s.frame_start=1; s.frame_end=840
s.frame_set(1)
print('KEEP',len(keep),sorted(o.name for o in keep if o.type=='MESH')[:80])
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True,
    export_animations=True, export_animation_mode='NLA_TRACKS', export_merge_animation='NLA_TRACK',
    export_force_sampling=True, export_optimize_animation_size=True, export_frame_range=False,
    export_image_format='WEBP', export_image_quality=85,
    export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
    export_draco_position_quantization=14, export_draco_normal_quantization=10, export_draco_texcoord_quantization=12, export_draco_generic_quantization=12,
    export_cameras=False, export_lights=False, export_yup=True, export_apply=False, export_skins=True, export_extras=False,
    export_reset_pose_bones=True, export_rest_position_armature=True)
print('DONE',OUT,os.path.getsize(OUT))
