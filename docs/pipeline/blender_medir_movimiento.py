import bpy, json, sys
from mathutils import Vector
OUT=sys.argv[sys.argv.index('--')+1]
s=bpy.context.scene
res={}
def analyze(rigname, actname, f0, f1):
    rig=bpy.data.objects[rigname]; ad=rig.animation_data
    old=ad.action
    act=bpy.data.actions[actname]
    ad.action=act
    try:
        if hasattr(ad,'action_slot') and ad.action_slot is None and len(act.slots): ad.action_slot=act.slots[0]
    except Exception as e: pass
    prev=None; energy=[]; roots=[]
    for f in range(int(f0), int(f1)+1):
        s.frame_set(f)
        mw=rig.matrix_world
        pts=[mw@pb.head for pb in rig.pose.bones]+[mw@pb.tail for pb in rig.pose.bones]
        if prev: energy.append(round(sum((a-b).length for a,b in zip(pts,prev)),4))
        else: energy.append(0)
        prev=pts
        roots.append([round(v,3) for v in (mw@rig.pose.bones[0].head)])
    ad.action=old
    try:
        if hasattr(ad,'action_slot') and old and len(old.slots): ad.action_slot=old.slots[0]
    except Exception: pass
    return {'f0':f0,'energy':energy,'root':roots,'bones':[b.name for b in rig.pose.bones], 'slot': str(getattr(ad,'action_slot',None))}
res['BD_main']=analyze('Rig_BLACKDOT','BD_Skate_Keyframes',1,1100)
res['BD_acc']=analyze('Rig_BLACKDOT','ACC_Rig_BLACKDOT',1,840)
res['KA_main']=analyze('Rig_KAIRO','ACC_Rig_KAIRO',1,1100)
res['NOX_main']=analyze('Rig_NOX','NOX_Keyframes',1,1100)
res['NOX_acc']=analyze('Rig_NOX','ACC_Rig_NOX',1,840)
# action fcurve groups / slots
info={}
for a in bpy.data.actions:
    if a.name.startswith(('ACC_','BD_Skate','NOX_Key')):
        try:
            info[a.name]={'slots':[(sl.identifier, sl.target_id_type) for sl in a.slots]}
        except Exception as e: info[a.name]=str(e)
res['actinfo']=info
json.dump(res,open(OUT,'w'))
