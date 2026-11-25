import bpy, sys
args=sys.argv[sys.argv.index('--')+1:]
SRC, OUT, CRF = args[0], args[1], args[2]
s=bpy.context.scene
s.render.resolution_x=1920; s.render.resolution_y=1080; s.render.resolution_percentage=100
s.render.fps=30; s.render.fps_base=1
s.frame_start=1; s.frame_end=1200
s.view_settings.view_transform='Standard'; s.view_settings.look='None'; s.view_settings.exposure=0; s.view_settings.gamma=1
se=s.sequence_editor_create()
coll = se.strips if hasattr(se,'strips') else se.sequences
m=coll.new_movie('cine', SRC, 1, 1)
snd=coll.new_sound('audio', SRC, 2, 1)
print('MOVIE', m.frame_final_duration, 'SOUND', snd.frame_final_duration, 'cs', m.colorspace_settings.name)
s.render.image_settings.media_type='VIDEO' if hasattr(s.render.image_settings,'media_type') else None
s.render.image_settings.file_format='FFMPEG'
ff=s.render.ffmpeg
ff.format='MPEG4'; ff.codec='H264'
ff.constant_rate_factor=CRF
ff.ffmpeg_preset='BEST'
ff.gopsize=30; ff.use_max_b_frames=True; ff.max_b_frames=2
ff.audio_codec='AAC'; ff.audio_bitrate=192; ff.audio_mixrate=48000; ff.audio_channels='STEREO'
s.render.use_sequencer=True; s.render.use_compositing=False
s.render.filepath=OUT
bpy.ops.render.render(animation=True)
print('ENCODED')
