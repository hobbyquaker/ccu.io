sox -d -r 16000 -c 1 temp.flac silence -l 1 0.1 1%% 1 0.3 1%%
sox --multi-threaded temp.flac -n spectrogram -t temp.flac -o sample.png