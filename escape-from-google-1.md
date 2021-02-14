如何逃離 Google 之一
====================
注意! 本文假設你具有相當的 Linux 程度，所有的操作都在 shell 下，
並且不會提醒你什麼時候要切到 root 。如果你覺得很困擾的話，請在朋友圈內找一個 
Linux 程度較好的人幫忙。


前言，與技術無關的事
--------------------
我從 GMail 開放 beta test 的時候，就開始使用了。在搜尋引擎技術才剛剛突破的那個年代，
Google 的 [Don't be evil](https://en.wikipedia.org/wiki/Don%27t_be_evil) 代表的是一種承自
Unix 的 hacker 文化的理想。 即使知道 Google 是公司而不是社會企業，
我們相信它必然會找到一個適合的營利模式，可能是販賣企業版套件(像現在的 G Suite)，
可能是販賣企業內部用的搜尋引擎(並沒有發生)。但如果你問 2005 年的我，誰會把使用者的隱私權
拿去做生意，我大概會猜 Microsoft ... 我那時候甚至不會知道 15 年後的現在，幾乎每一家網路公司
都在做隱私權生意。

自從 2015 年 Alphabet 把 Don't be evil 改成 Do the right thing 以來 (誰定義什麼是 right?)
我一直想要奪回自己的數位主權。才 15 年的時間，這件事已經變成非常地困難，只要你使用
Android 手機，你就幾乎沒辦法不註冊一個 Google 帳號，幾乎沒辦法不把資料同步上去，除非
你願意刷機成 CM 並使用 F-Droid 等開源的軟體中心；使用 Apple 不論是 iPhone 或 Macbook，
就一定得開 iCloud 帳號，也幾乎不能不上傳資料。這兩家公司把基礎服務做得太方便好用了，
要脫離幾乎是不可能的。此外，近年來為了防範資安事故、垃圾郵件，自己動手做基礎建設，
需要多做不少事情。幸好，現在有了 Postfix 不需要再花大量力氣設定 Sendmail.cf, 而且有
`apt install` 做套件管理，還有許多便宜的 VPS 服務商，自己做的門檻，並不算真的太高。

在 [開放文化基金會](https://ocf.tw) 的 [公民團體資安暨隱私交流計劃](https://ocf.tw/p/cscs/)
擔任志工的時候，我試著把 15 年來放在 Google 上的資料打包回家，有許多事我已經忘了，
但 Google 還記得, et ça me gène beaucoup, 於是決定要拾回架設網路服務的技能。

自己架設基礎服務一定會比較辛苦，availability 也絕對比使用雲端大廠低很多，甚至
一年 SLA 到 99% 都不可能保證。自由的代價何其高。

如果有任何寫錯的地方，敬請寄信給 feedback 小老鼠 miaoski 點 idv 點 tw 指正。



架設 Raspbery Pi 或租用 VPS
===========================
架設服務首先需要能從 Internet 連到的機器。我們可以使用 Raspberry Pi 這樣的小板電腦
自己架設，或是到 [Digital Ocean](https://www.digitalocean.com/) 這樣的 VPS 廠商租用
每月 5 美元或 10 美元的小型虛擬機。本文以架設在自家 ADSL 的小板為例。

使用 Raspberry Pi 的話，建議購買 **加了散熱片** 的 Pi 3 B+ ，或是使用硬體規格更高的小板，
如 Cubieboard 2 、 BananaPi 或 Odroid C2 等等。有 1GB RAM 就夠了，散熱片一定要裝，
否則在台灣的氣候下一定會熱當。

我目前用了最滿意的硬體，是使用 Intel Celeron N3450 的「銳角雲」倒店貨。但使用中國製
倒店貨的前提，是必須承擔一定的資安風險 -- 沒人知道銳角雲會不會有 out-of-band 的 NIC 後門。
由於我的路由器是 OpenWRT ，在流量幾乎都可以自己控管的情況下，大概是不需要擔心。


先決定使用固定 IP 或浮動 IP
---------------------------
使用動態 DNS (DDNS) 並且不介意透過 ISP 轉信的話，就可以使用浮動 IP 架設，
但是轉信時 ISP 可以取得 email 的明文，這是個資安風險。
為了 email 的安全性，本文使用固定 IP + 不要透過 ISP 轉信。

我之前使用手邊拿得到的設備: Cubieboard2 + SSD 硬碟 + Hinet ADSL (固1)。
這並不代表我建議使用 Cubieboard，使用任何中國製的晶片，必須明白它帶來相當程度
的資安風險。

為了設定 PPPoE 時的便利，建議準備一張 Edimax 無線網卡，以便連上家裡的內網，
不然很可能需要把 HDMI 螢幕和 USB 鍵盤移到小烏龜旁邊，進行設定。


下載 Cubieboard2 用的 armbian (Debian 9)
----------------------------------------
Raspberry Pi 的使用者，請直接使用官網上的 Raspbian 就好了。

Cubieboard2 的使用者，請到 [armbian](https://www.armbian.com/cubieboard-2/) 下載
Armbian Stretch ，它是基於 Debian 9 的發行版。按照一般安裝程序就對了...
裝完以後，設定好帳號密碼，執行 `nmcli device wifi connect <AP> password <pass>`
連上家裡的無線網路，ssh 進去，再把有線網路插在小烏龜上，設定 PPPoE。

要使用 Edimax 的無線網卡(Realtek 晶片)，才有內建驅動程式，如果用 TP-Link TL-WN722N
的話，會找不到 Atheros 的韌體。它不是開源的，重新 build Atheros open firmware 在 RPi
等級的硬體上，要花好幾個小時。


安裝套件
--------
為了作業方便，請安裝以下套件:
```bash
apt install ssh
apt install vim screen
apt install ufw
apt install mutt postfix
apt install pppoeconf telnet
apt install build-essential
apt install python-pip python3-pip 
apt install weechat   # 這個是 IRC 客戶端，不一定要裝
apt install mosquitto supervisor   # 如果要跑 MQTT 服務的話再裝
```


設定 pppoe
----------
按一般的情況使用 `pppoeconf` 即可。要使用固定 IP 的話，username 別忘了要填
`HNNumber@ip.hinet.net`。為了收信和寄信，建議去 Hinet 網站
[申請一組 Domain Name](https://domain.hinet.net/) +
[設定反解](https://domain.hinet.net/dns_reverse_c/) 。



設定 sshd
---------
由於小板直接暴露在 Internet 上，建議在 `/etc/ssh/sshd_config` 裡改一下
```
PasswordAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
```


使用 Digital Ocean
------------------
安裝 Ubuntu 或 Debian 映像，剩下的和上面差不多，但是你不一定拿得到
**相對固定**的 IP (完全固定的 IP 就算拿得到，定價也會很貴)。好處是
Digtal Ocean 不會熱當，同時他們有提供很好的 DNS 服務。



設定 Postfix 郵件伺服器
=======================
本文的第一個部份使用 Hinet 郵件伺服器轉信 (成功率高!) 第二個部份才是
試著自己架設完整的 MTA。

不知道為什麼，postfix 在自己的目錄下有一個 `resolv.conf`。
為了避免出錯，請先執行

```bash
cp /etc/resolv.conf /var/spool/postfix/etc/resolv.conf
```

main.cf
-------
基本上沒什麼特別需要改的。如果你的 PPPOE 只會給你 IPv4 的話，記得把
`inet_protocols` 設為 `ipv4` ，不然就維持原本的 `all` 即可。


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

virtual_alias_maps = hash:/etc/postfix/virtual
```


relayhost 使用 Hinet 轉信
-------------------------
不知道為什麼 `[msa.hinet.net]:587` 和 `[msr.hinet.net]:587` 使用 SASL 會出現 
deferred (SASL authentication failed; cannot authenticate to server msa.hinet.net[168.95.4.211]: no mechanism available
這樣的錯誤訊息。但是使用 `msa.hinet.net` 有很高的機率成功寄信。


/etc/postfix/sasl/passwd
```
[msa.hinet.net] email@msa.hinet.net:password
[msr.hinet.net] email@msa.hinet.net:password
[msa.hinet.net]:587     email@msa.hinet.net:password
[msr.hinet.net]:587     email@msa.hinet.net:password

```

記得要執行 `postmap /etc/postfix/sasl/passwd` 產生 passwd.db 檔。

請儘量避免使用沒加 `:587` 的 relayhost，port 587 支援 TLS 加密，而
port 25 傳統上是給明文傳輸使用。當然，port 25 也可以 STARTTLS，
並不是說 port 25 就只能是明碼。更多細節請參考 
[Which SMTP Port Should I Use? Understanding Ports 25, 465, & 587](https://www.mailgun.com/blog/which-smtp-port-understanding-ports-25-465-587) 。

設定到這裡，執行 `/etc/init.d/postfix restart` 後，理論上應該可以收信 + 發信了。
我試過從 GMail 發信過來、以及寄信給 GMail 都沒有問題。


Catch-all
---------
自己架設 postfix 的好處之一，是可以自訂 email 規則，比方說把所有寄給 me@miaoski.idv.tw, 
ccc@miaoski.idv.tw, hitcon@miaoski.idv.tw 的信，通通收下來，這樣你就知道誰把你的 email
出賣給 spammer 了！

只要新增檔案 `/etc/postfix/virtual` 並填入以下內容:
```
@miaoski.idv.tw		my_unix_account
@other.domain.tw	my_unix_account
```

再執行 `postmap /etc/postfix/virtual` 就可以了。當然這也有一些壞處，比方說你會收到更多的 spam ...
但是你可以自訂郵件規則，在 client 端處理這件事。



不透過ISP轉信
=============
這個年代不透過 ISP 寄信，幾乎沒辦法通過 GMail 的重重關卡。
但如果要避開 ISP 可能的監控 (即使 ISP 端使用 SASL + TLS, MTA 仍然可以取得信件明文，除非在 local → ISP 就已經使用 TLS)，
還是必須想辦法，不要透過 relayhost 轉信。



使用 Mutt 等郵件閱讀器
======================
使用 Mutt 就直接 ssh 進去打 mutt 就好了 :D

命令列的好處是，你幾乎不可能中內嵌的釣魚信、iFrame 釣魚信，不可能點兩下就把
含有 0-day 或 1-day 的附檔打開 (至少要先 scp 回自己的筆電...) ，資安馬上提升了一個等級。
如果覺得命令列實在用不習慣，可以設定 Thunderbird 。


Catch-all
---------
搭配 catch-all 使用的時候，我們希望 mutt 可以使用 To: 所指定的 email 地址回信，比方說
寄給 feedback at miaoski 的信，我們就希望回信的 From: 欄是 feedback at miaoski 而不是
你用來收信的 `my_unix_account` 帳號。做法很簡單， `~/.muttrc` 加一行就好:

```
set reverse_name = yes
```

如果想在手機上收信、回信的話，可以安裝 DoveCot + LetsEncrypt 憑證。


Dovecot
=======
Dovecot 幾乎直接 apt install 就可以用了，除了 SSL 的部份，路徑要改成 LetsEncrypt 簽發的 SSL 憑證之外，
都不需要特別的設定。

`/etc/dovecot/conf.d/ssl.conf` 修改如下:
```
ssl = required
ssl_cert = </etc/letsencrypt/live/miaoski.idv.tw-0001/fullchain.pem
ssl_key = </etc/letsencrypt/live/miaoski.idv.tw-0001/privkey.pem
```

LetsEncrypt
-----------
網路上非常多介紹 LetsEncrypt 的文章，這裡不再贅述。由於 Dovecot, Postfox, Nginx, ... 
都需要用到 SSL 憑證，建議別忘了每三個月跑一次 certbot 更新憑證。
