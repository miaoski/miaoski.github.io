如何逃離 Google 之一
====================
注意! 本文假設你具有相當的 Linux 程度，所有的操作都在 shell 下，並且不會提醒你什麼時候要切到 root 。
如果你覺得很困擾的話，請在朋友圈內找一個 Linux 程度較好的人幫忙。

為什麼要逃離 Google?
--------------------


架設 Raspbery Pi 或租用 VPS
===========================
如果使用動態 DNS (DDNS) 並且不在意透過 ISP 轉信的話，就不需要使用動態 IP；
但是為了更好的安全性，建議還是使用固定 IP + 不要透過 ISP 轉信。

我用了手邊拿得到的設備: CubieBoard2 + SSD 硬碟 + Hinet ADSL (固1浮6) 來架設必須的服務。
建議準備一張 Edimax 無線網卡，不然就需要把 HDMI 螢幕和 USB 鍵盤移到小烏龜旁邊。


下載 CubieBoard2 用的 Debian Linux 9
------------------------------------
安裝就對了... 裝完以後，執行 `nmcli device wifi connect <AP> password <pass>` 連上無線網路，
這樣就可以輕鬆地把小板裝在小烏龜旁邊。

使用 Edimax 的無線網卡，才有內建驅動程式，如果用 TP-Link TL-WN722N 的話，會找不到 Atheros 的韌體。它不是開源的。


安裝套件
--------
我為了作業方便，安裝了以下套件:
```bash
apt install ssh
apt install vim screen weechat 
apt install build-essential
apt install python-pip python3-pip 
apt install mosquitto supervisor
apt install ufw
apt install mutt postfix
apt install pppoeconf telnet
```


設定 pppoe
----------
按一般的情況使用 `pppoeconf` 即可。要使用固定 IP 的話，別忘了使用 `HNNumber@ip.hinet.net`。
為了收信和寄信，建議去 Hinet 網站申請一組 Domain Name + 設定反解。



郵件伺服器
==========
不知道為什麼，postfix 在自己的目錄下有一個 `resolv.conf`。為了避免出錯，請執行

```bash
cp /etc/resolv.conf /var/spool/postfix/etc/resolv.conf
```

main.cf
-------
基本上沒什麼特別需要改的。如果你的 PPPOE 只會給你 IPv4 的話，記得把
`inet_protocols` 設為 `ipv4` ，不然就維持 `all` 就好了。


/etc/post/main.cf
```
smtpd_banner = $myhostname ESMTP $mail_name (Debian/GNU)
biff = no
append_dot_mydomain = no
readme_directory = no
compatibility_level = 2

smtpd_tls_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem
smtpd_tls_key_file=/etc/ssl/private/ssl-cert-snakeoil.key
smtpd_use_tls=yes
smtpd_tls_session_cache_database = btree:${data_directory}/smtpd_scache
smtp_tls_session_cache_database = btree:${data_directory}/smtp_scache

smtpd_relay_restrictions = permit_mynetworks permit_sasl_authenticated defer_unauth_destination
myhostname = miaoski.idv.tw
alias_maps = hash:/etc/aliases
alias_database = hash:/etc/aliases
myorigin = /etc/mailname
mydestination = miaoski.idv.tw, ljm.idv.tw, localhost, localhost.localdomain, localhost
relayhost = [msa.hinet.net]:587
mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128
mailbox_size_limit = 0
recipient_delimiter = +
inet_interfaces = all
inet_protocols = ipv4

smtp_sasl_auth_enable=yes
smtp_sasl_password_maps=hash:/etc/postfix/sasl/passwd
smtp_sasl_security_options=noanonymous
smtp_tls_security_level = encrypt
header_size_limit = 4096000
```


/etc/postfix/sasl/passwd
------------------------
不知道為什麼 `[msr.hinet.net]:587` 使用 SASL 會出現 
deferred (SASL authentication failed; cannot authenticate to server msa.hinet.net[168.95.4.211]: no mechanism available
這樣的錯誤訊息。使用 `msa.hinet.net` 也會，但是也有機率成功寄信。


/etc/postfix/sasl/passwd
```
[msa.hinet.net] email@msa.hinet.net:password
[msr.hinet.net] email@msa.hinet.net:password
[msa.hinet.net]:587     email@msa.hinet.net:password
[msr.hinet.net]:587     email@msa.hinet.net:password

```

記得要執行 `postmap /etc/postfix/sasl/passwd` 產生 .db 檔。

設定到這裡，執行 `/etc/init.d/postfix restart` 後，理論上應該可以收信 + 發信了。
我試過從 GMail 發信過來、以及回信給 GMail 都沒有問題。


不透過ISP轉信
-------------
這個年代不透過 ISP 寄信，幾乎沒辦法通過 GMail 的重重關卡。
但如果要避開 ISP 可能的監控 (即使使用 SASL + TLS, MTA 仍然可以解密的)
還是必須想辦法，不要透過 relayhost 轉信。



使用 Mutt 並設定郵件閱讀器
--------------------------

