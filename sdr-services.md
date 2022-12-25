前言
====
最近考到業餘二等執照後，迷上架設各種 SDR 服務。本文要介紹的有 WebSDR 及 APRS iGate 。
有新的服務也會更新於此。


WebSDR
======
[WebSDR](http://www.websdr.org/) 是 PA3FWM 寫的軟體，架設 WebSDR 需要寫信給他，以取得安裝的套件。程式是 C 寫的，但是沒有開放原始碼。
會想要架設 WebSDR, 主因是 2020 年底 ISS 使用 SSTV 傳送賀年明信片的時候，我手邊沒有適合的接收設備 
(VHF, 天線在室外應該都收得到) 而且錯過了 communication window 就要等上半天，所以就在網路上使用別人的 WebSDR
接收，再使用 qsstv 解碼。

台灣之前沒有人架設 WebSDR，所以架設也是增加國際能見度的方法。

台灣有幾位友台架設了 OpenWebRX, 我目前也覺得 OpenWebRX 介面和效果都比較好，只是需要更大的運算能力，
特別是在提供 FT8 和其它數位模式解碼的情況下，大概會需要正常一點的桌機。

硬體是使用廢棄的電視天線 (Yagi) 、廢棄的同軸電纜、加上舊的 RTL-SDR v2 。品質堪用而已，
主要是 Yagi 的指向性很強，但 WebSDR 最好是全向接收，才能收到最多的電台。WebSDR 支援超過一隻 RTL-SDR
所以可以同時提供 2m 波段及 70cm 波段的接收服務。

指令非常簡單，選用 1,536,000 S/s 的原因容後再述。

```bash
$ rtl_tcp -a 127.0.0.1 -p 65144 -f 145000000 -d 0 -s 1536000	# 第 1 隻，中心頻率 145 MHz
$ rtl_tcp -a 127.0.0.1 -p 65145 -f 432000000 -d 1 -s 1536000	# 第 2 隻，中心頻率 432 MHz
```

`websdr.cfg` 的寫法，請參考檔案內的說明，以下只是個參考:

```
# 第1隻是舊的 RTL-SDRv2, 偏移到 103ppm 這麼誇張的程度
device !rtlsdr 127.0.0.1:65144 103
samplerate 1536000
centerfreq 145000
antenna TV-Yagi
# 第2隻是 RTL-SDRv3, 偏移可以不計
band 70cm
device !rtlsdr 127.0.0.1:65145
samplerate 1536000
centerfreq 432000
antenna TV-Yagi
```

台灣規定可使用的 UHF 為 430 MHz - 440 MHz，但因為 RTL-SDR 取樣能力有限，只能任選一個 1.5 MHz 寬的波段。

想聽聽看的話，可以去 http://miaoski.idv.tw:8901/ 可以聽到不少運將聊天 XD


APRS iGate
==========
APRS 是 automatic packet reporting system ，但通常都被放在車子上，搭配 GPS 廣播自己的所在位置，
像資安從業人員是絕對不會做這種事的 :)

想大概了解一下的話，可以去 https://aprs.fi/ 看一下自己所在位置有哪些呼號在哪裡。

架設 APRS iGate 的方法可以參考 [Raspberry Pi SDR iGate](https://github.com/wb2osz/direwolf/blob/master/doc/Raspberry-Pi-SDR-IGate.pdf) ，這裡要介紹的是和 WebSDR 共存的方法。

由於 WebSDR 只支援 2,048,000 和 1,536,000 這兩種取樣率，如果使用 2,048,000 S/s 的話，會沒辦法整除降為
48 kHz 或 24 kHz ，不能降為 24 kHz 就不能讓 AFSK 1200 bps MODEM 解碼。所以我們必須在上面選擇 1,536,000 S/s.
此外，由於 `rtl_tcp` 只能服務一個客戶端，我們必須使用 `nmux` 把串流複製成 n 份，具體來說指令如下:

```bash
# 把第1隻的 rtl_tcp 改成這樣:
$ rtl_sdr -f 145000000 -d 0 -p 103 -s 1536000 - | nmux -a 127.0.0.1 -p 65144 -b 256000
```

此外，因為不能直接使用 `rtl_fm` 進行 NFM (!!!) 解碼，我們必須使用 HA7ILM 的 [csdr](https://github.com/ha7ilm/csdr) 。
說明如下:

```
$ nc 127.0.0.1 65144 | \                    # 從 rtl_tcp 接收串流
  csdr convert_u8_f | \                     # 把 uint8 的 I/Q 轉成 float
  csdr shift_addition_cc 0.234375 | \       # 1536k * 0.234375 = 360k, 把中心頻率移動到 144.640 MHz (台灣的 APRS 頻道)
  csdr fir_decimate_cc 32 0.05 HAMMING | \  # 使用 FIR 做 decimation 除 32 倍 1536k/32 = 48k
  csdr fmdemod_quadri_cf | \                # 解 NFM
  csdr limit_ff | \                         # 限制輸出的振幅
  csdr convert_f_s16 | \                    # 把 float 轉為 signed 16bit
  direwolf -r 48000 -d 1 -                  # 使用 direwolf 解碼 AFSK 1200bps 再送到 APRS server
```

direwolf 的設定檔就不貼了，你需要呼號才能使用 :)

收到的東西大概會像這樣:

```
[0.2] BV3UU-9>APRS,BM2MCF-12,WIDE1*,WIDE2-2:/105703h2504.55N/12131.34E(110/044/A=000189Trackuino Ver20180711 Sat:11 4.5V
Position with time, Mobile Satellite Station, Generic, (obsolete. Digis should use APNxxx instead)
N 25 04.5500, E 121 31.3400, 51 MPH, course 110, alt 189 ft
Trackuino Ver20180711 Sat:11 4.5V

Digipeater BX2ADJ-2 audio level = 48(13/11)   [NONE]   _||||||__
[0.3] BV3UU-9>APRS,BM2MCF-12,WIDE1,BX2ADJ-2*,WIDE2-1:/105703h2504.55N/12131.34E(110/044/A=000189Trackuino Ver20180711 Sat:11 4.5V
Position with time, Mobile Satellite Station, Generic, (obsolete. Digis should use APNxxx instead)
N 25 04.5500, E 121 31.3400, 51 MPH, course 110, alt 189 ft
Trackuino Ver20180711 Sat:11 4.5V

Digipeater WIDE1 (probably BM2MCF-12) audio level = 81(22/22)   [NONE]   _||||||__
[0.3] BV3UU-9>APRS,BM2MCF-12,WIDE1*,WIDE2-2:/105800h2504.38N/12132.07E(102/049/A=000156Trackuino Ver20180711 Sat:11 4.5V
Position with time, Mobile Satellite Station, Generic, (obsolete. Digis should use APNxxx instead)
N 25 04.3800, E 121 32.0700, 56 MPH, course 102, alt 156 ft
Trackuino Ver20180711 Sat:11 4.5V

Digipeater BX2ADJ-2 audio level = 47(12/12)   [NONE]   _||||||__
[0.3] BV3UU-9>APRS,BM2MCF-12,WIDE1,BX2ADJ-2*,WIDE2-1:/105800h2504.38N/12132.07E(102/049/A=000156Trackuino Ver20180711 Sat:11 4.5V
Position with time, Mobile Satellite Station, Generic, (obsolete. Digis should use APNxxx instead)
N 25 04.3800, E 121 32.0700, 56 MPH, course 102, alt 156 ft
Trackuino Ver20180711 Sat:11 4.5V

Digipeater WIDE1 (probably BM2MCF-12) audio level = 69(22/22)   [NONE]   |||||||__
[0.3] BV3UU-9>APRS,BM2MCF-12,WIDE1*,WIDE2-2:/105911h2504.33N/12132.97E(090/034/A=000137Trackuino Ver20180711 Sat:11 4.5V
Position with time, Mobile Satellite Station, Generic, (obsolete. Digis should use APNxxx instead)
N 25 04.3300, E 121 32.9700, 39 MPH, course 90, alt 137 ft
Trackuino Ver20180711 Sat:11 4.5V

Digipeater BX2ADJ-2 audio level = 51(12/11)   [NONE]   |||||||__
[0.3] BV3UU-9>APRS,BM2MCF-12,WIDE1,BX2ADJ-2*,WIDE2-1:/105911h2504.33N/12132.97E(090/034/A=000137Trackuino Ver20180711 Sat:11 4.5V
Position with time, Mobile Satellite Station, Generic, (obsolete. Digis should use APNxxx instead)
N 25 04.3300, E 121 32.9700, 39 MPH, course 90, alt 137 ft
Trackuino Ver20180711 Sat:11 4.5V
```


WSJT-X
======
如果要 monitor FT8 的話，我目前使用的是 wjst-x + VNC + RTL-SDR, 白天切到 15m 波段，晚上切到 40m 波段。

首先安裝 wsjtx, vncserver, rtl-sdr, 然後設定好 WSJT-X。我使用二個 profile: 
sdr-40m 給40米波段、
sdr-15m 給15米波段，
必須設定呼號。

相關的 script 如下:

`cron.sh`
```bash
#!/bin/bash
# UTC 0000-1000 15m
# UTC 1000-2359 40m
export TZ=UTC
export DISPLAY=:1

while true; do

if [ `date +%H` -lt 10 ]; then
	until=$((10*60*60))
	band="15m"
else
	until=$((24*60*60))
	band="40m"
fi

echo "Starting FT8 $band at" `date` >> ~/cron.log
~/ft8.sh $band &
sleep 5

ts=$(date +%s)
to=$((until - ts % 86400))
echo "Starting wsjtx -c sdr-$band (timeout: ${to}) at" `date` >> ~/cron.log
timeout ${to} wsjtx -c sdr-$band
kill %1

echo "All stopped at" `date` >> ~/cron.log


done
```

WSJT-X 要跑得起來，一定要先跑 vncserver ，讓 `DISPLAY=:1` 可以顯示它的 GUI.

然後 `ft8.sh` 使用了 PulseAudio 的 Virtual channel ，自動把 RTL-SDR 的結果丟進 mplayer (謎之音: 真的需要 mplayer 嗎?)

```bash
#!/bin/bash
BW=1200000
if [ "$1" = "40m" ]; then
	DC=7000000
	FT=7074000
fi
if [ "$1" = "15m" ]; then
	DC=21100000
	FT=21074000
fi
if [ "x${FT}" = "x" ]; then
	print "Try $0 40m"
	exit 10
fi
# DC=14100000
# FT=14074000
GAIN=15
rtl_sdr -s ${BW} -f ${DC} -D 2 -g ${GAIN} - | \
	csdr convert_u8_f | \
	csdr shift_addition_cc `python -c "print(float(${DC}-${FT})/${BW})"` | \
	csdr fir_decimate_cc 25 0.05 HAMMING | \
	csdr bandpass_fir_fft_cc 0 0.5 0.05 | \
	csdr realpart_cf | \
	csdr agc_ff | \
	csdr limit_ff | \
	csdr convert_f_s16 | \
	mplayer -nocache -rawaudio samplesize=2:channels=1:rate=48000 -demuxer rawaudio -ao pulse::Virtual0 -
```

因為需要 Virtual0, 記得在 `/etc/pulse/default.pa` 加上:

```
load-module module-null-sink sink_name=Virtual0 sink_properties=device.description="Virtual0"
load-module module-null-sink sink_name=Virtual1 sink_properties=device.description="Virtual1"
```

這樣就可以自動守聽 FT-8 並上傳到 PSK Reporter 了。
