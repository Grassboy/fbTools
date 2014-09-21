//{{ whole TimeLine jumper (Start)
(function(){
  //initial
  if(!window.GLOBAL || !window.GLOBAL.page_user) return; //防止render錯頁
  if(!window.TimeLine || window.TimeLine.jumper) return; //防止重複定義
  //{{ var TimeLineJumperInit = function(){
  var TimeLineJumperInit = function(){
    var getTimeAndFixPlurk = function(plurk){
      if(!plurk.posted){
        plurk.posted = new Date();
      } else if(AJS.isString(plurk.posted)){
        plurk.posted = new Date(plurk.posted);
      }
      return plurk.posted.getTime();
    };

    //{{ Plurk's JS Function Override
    TimeLine.getPlurks = function (e, config) {
      config = config || {};
      var c = TimeLine;
      //{{ start of fbinplurkhack: return false會加個config.reGetPlurks判斷, 還加了jumpto判斷
      if (c.getting_plurks || c.offset == null) {
        if(!config.reGetPlurks) return false; //如果是reGetPlurks，那就一定要get
      }
      delete config.reGetPlurks;
      if(config.jumpTo) { 
        TimeLine.offset = new Date(config.jumpTo);
        delete config.jumpTo;
      } if (TimeLine.jumper_reset_offset && TimeLine.notAtBegin){
        TimeLine.offset = new Date(TimeLine.jumper_reset_offset);
      }
      delete TimeLine.jumper_reset_offset;
      ////}}
      c.getting_plurks = true;
      if (c.plurks.length > 0) {
        c.showLoadingBlock()
      }
      var f = function(uid){
        return function (g) {
          var key = "u"+uid;
          var fetched = false;
          var hh;
          var tryFetchH = function(){ 
            if(--TimeLine.remainCount <= 0){
              var minBegin = null;
              var maxEnd = null;
              g = [];
              for(key in TimeLine.receiveBuffer){
                userPlurks = TimeLine.receiveBuffer[key];
                if(userPlurks.length == 0) continue;
                if(config.addToTop && (!minBegin || getTimeAndFixPlurk(AJS.getFirst(userPlurks)) > minBegin))
                  minBegin = getTimeAndFixPlurk(AJS.getFirst(userPlurks));
                else if(!config.addToTop && (!maxEnd || getTimeAndFixPlurk(AJS.getLast(userPlurks)) > maxEnd))
                  maxEnd = getTimeAndFixPlurk(AJS.getLast(userPlurks));
                g = g.concat(userPlurks);
              }
              delete TimeLine.receiveBuffer;
              g.sort(c._sortPlurks);
              for(var i = 0; i < g.length-1; i++){
                if(g[i].id == g[i+1].id){
                  g.splice(i--, 1);
                }
              }
              if(g.length != 0){
                if(config.addToTop){
                  for(var i = 0 ; i < g.length; i++){
                    if(getTimeAndFixPlurk(g[i]) <= minBegin){
                      g.splice(0, i);
                      break;
                    };
                  }
                } else {
                  for(var i = 0 ; i < g.length; i++){
                    if(getTimeAndFixPlurk(g[i]) < maxEnd){
                      g.splice(i, g.length);
                      break;
                    };
                  }
                }
              }
              fetched = true;
              return true;
            } else {
              return false;
            }
          };
          if (g.error || !TimeLine.receiveBuffer) {
            if(g.error == "NoReadPermissionError") {
              alert(["河道任意門 通知：\n",
                  "\t很抱歉，由於 ",SiteState.getUserById(uid).nick_name," 的河道是私密河道\n",
                  "\t因此河道無法顯示他的噗…"].join(''));
              for(var i = 0; i < TimeLine.jumper_user_ids.length; i ++){
                if(TimeLine.jumper_user_ids[i]==uid)
                  TimeLine.jumper_user_ids.splice(i--, 1);
              }
              if(TimeLine.jumper_user_ids.length==0)
                TimeLine.jumper_user_ids.push(SiteState.getPageUser().uid);
            }
            if(!TimeLine.receiveBuffer) TimeLine.receiveBuffer = {};
            TimeLine.receiveBuffer[key] = [];
            if(tryFetchH() && g.length != 0){
              if (c.plurks.length > 0) {
                c.removeLoadingBlock(g);
              }
              return c._plurksFetched(g);
            }
            return;
          }
          if (!(g.constructor == Array) && g.plurks) {
            g = g.plurks
          }
          if(!fetched){
            if(TimeLine.receiveBuffer[key] && TimeLine.receiveBuffer[key].length > 0) {
              hh = TimeLine.receiveBuffer[key] = TimeLine.receiveBuffer[key].concat(g); //把之前取得的buffer接上去
            } else {
              hh = TimeLine.receiveBuffer[key] = g;
            }
            if(config.addToTop){
              if(AJS.getLast(hh) && AJS.getLast(hh).id > TimeLine.plurks[0].id){ //表示目前取到的plurks沒有和河道接上
                TimeLine.offset = config.offset = new Date(getTimeAndFixPlurk(AJS.getLast(hh))-1000);
                config.reGetPlurks = true; 
                config.uid = uid;
                TimeLine.getPlurks(e, config);
                return;
              }
              for(var i = 0; i < hh.length; i++){
                if(hh[i].id <= TimeLine.plurks[0].id){
                  hh.splice(i--,1);
                }
              }
              if(hh.length == 0){ //沒抓到新的，表示區間內正好沒新的，因為如果已捲到開頭，則TimeLine.notAtBegin必為false
                config.uid = uid;
                config.offset = TimeLine.setOffsetForward();
                if(config.offset.getTime() > (new Date()).getTime()) {
                  TimeLine.notAtBegin--;
                  TimeLine.atBeginUid[key] = true;
                  if(TimeLine.notAtBegin == 0){
                    c.removeLoadingBlock(g);
                    TimeLine.getting_plurks = false;
                    e();
                  }
                } else {
                  config.reGetPlurks = true;
                  TimeLine.getPlurks(e, config);
                }
                return;
              }
            }
            if(tryFetchH() == false) return;
          }
          if (c.plurks.length > 0) {
            c.removeLoadingBlock(g);
          }

          //{{ start fbinplurk hack 這中間有一段 banana 相關的 code 我直接刪掉
          // 反正應該是廣告XD
          //}}

          c._plurksFetched(g, e);
        };
      };
      //{{start fbinplurk hack 用個sendReq 包起來
      var sendReq = function(uid, offset){
        var d = {
          user_id: uid
        };
        if (offset) {
          d.offset = c.offset.toISOString()
        }
        if (c.user_ids) {
          d.user_ids = JSON.stringify(c.user_ids)
        }
        if (c.private_only) {
          d.only_private = 1;
        }
        if (c.favorite_only) {
          d.only_favorite = 1;
        }
        if (c.responded_only) {
          d.only_responded = 1;
        }
        if (TimeLineCache.inCache(d)) {
          setTimeout(function () {
            return (f(uid))(TimeLineCache.get(d));
          }, 30);
          return false;
        }
        var b = AJS.loadJSON("/TimeLine/getPlurks");
        if (c.plurks.length > 0) {
          b.addCallback(c.removeLoadingBlock)
        }
        b.addCallback(function (g) {
          if (!g.error) {
            if(g.constructor == Array){
              TimeLineCache.set(d, g);
            } else {
              AJS.update(USERS, g.replurkers);
              TimeLineCache.set(d, g.plurks)
            }
          }
        });
        b.addCallback(f(uid));
        var a = SiteState.getPageUser();
        if (a && a.public_view) {
          d.public_view = 1;
        }
        b.sendReq(d);
      };
      //}}
      if(config.uid && config.offset){
        sendReq(config.uid, config.offset);
      } else {
        var t = TimeLine.jumper_user_ids = TimeLine.jumper_user_ids || [SiteState.getPageUser().uid];
        var offset = c.offset;
        TimeLine.receiveBuffer = {};
        TimeLine.remainCount = t.length;
        for(var i = 0; i < t.length; i++){
          var uid = TimeLine.jumper_user_ids[i];
          if(config.addToTop){
            if(!TimeLine.atBeginUid["u"+uid]){
              sendReq(uid, offset);
            } else {
              TimeLine.remainCount--;
            }
          } else {
            sendReq(uid, offset);
          }
        }
      }
    };
    //}}

    TimeLineCache.addPlurk = function (a) {
      getTimeAndFixPlurk(a);
      var uid = SiteState.getSessionUser().uid;
      this.addToCache(uid+"-all", a);
      if (Plurk.isPrivate(a)) {
        this.addToCache(uid+"-private", a)
      }
      if (a.favorite) {
        this.addToCache(uid+"-favorite", a)
      }
      if (Plurk.isResponded(a)) {
        this.addToCache(uid+"-responded", a)
      }
      if (SiteState.getSessionUser().id == a.owner_id) {
        this.addToCache(uid+"-own", a)
      }
    };
    TimeLineCache.cacheKey = function (b) {
      var a = [];
      if (b.user_id){
        a.push(b.user_id);
      }
      if (b.offset) {
        a.push(b.offset)
      }
      if (b.only_favorite) {
        a.push("favorite")
      } else {
        if (b.only_private) {
          a.push("private")
        } else {
          if (b.only_responded) {
            a.push("responded")
          } else {
            if (b.user_ids) {
              a.push("own")
            } else {
              a.push("all")
            }
          }
        }
      }
      return a.join("-")
    };
    Tracks.canBeInserted = function (a, c) {
      if(c < 0){
        var d = AJS.getFirst(a);
        try {
          var b = AJS.absolutePosition(d).x - d.offsetWidth - 20
        } catch (f) {
          return true
        }
        if (navigator.userAgent.toLowerCase().indexOf("khtml") != -1) {
          b += 25
        }
        if (b > c) {
          return true
        }
        return false;   
      } else {
        var d = AJS.getLast(a);
        try {
          var b = d.offsetWidth + AJS.absolutePosition(d).x + 20
        } catch (f) {
          return true
        }
        if (navigator.userAgent.toLowerCase().indexOf("khtml") != -1) {
          b += 25
        }
        if (b < c) {
          return true
        }
        return false;
      }
    };
    TimeLine.scrollBack = function (h) {
      var g = TimeLine;
      if (tl_banana.enable && (!tl_banana.tID)) {
        tl_banana.tID = window.setTimeout(tl_banana.checkImpress, 300)
      }
      if (InfoOverlay.cloned) {
        InfoOverlay.hideInfoOverlay()
      }
      var d = AJS.getFirst(g.active_blocks);
      var c = AJS.getFirst(g.blocks);
      var f = AJS.getLast(g.active_blocks);
      var e = AJS.getLast(g.blocks);
      if (d == c && h > 0) {
        if (AJS.absolutePosition(getBD(d).div_bg).x > 25) {
          return false
        }
      }
      if (f == e && h < 0) {
        if (AJS.absolutePosition(getBD(e).div_bg).x < -50) {
          return false
        }
      }
      for (var b = 0; b < g.active_blocks.length; b++) {
        var a = g.active_blocks[b];
        var j = getBD(a);
        if (getBD(a).div_bg) {
          a.incLeft(j, h)
        }
      }
      if (g.active_blocks.length > 0) {
        //{{start fbinplurkhack 只是單純的這個參數的 h 丟到 startChecks function 裡
        g.startChecks(h);
        //}}
        g.endChecks()
      }
    };
    TimeLine.startChecks = function (direction) {
      var f = this;
      var d, h, g;
      var c = f.getCurActive();
      d = c[0];
      h = c[1];
      g = c[2];
      if (!h) {
        return
      }
      if ((h.offsetLeft + h.offsetWidth) < this.start_offset) {
        if (f.active_blocks.length < 2) {
          return true
        }
        d.removeRender();
        f.active_blocks.splice(0, 1)
      } else {
        if (h.offsetLeft > this.start_offset) {
          if (g != 0) {
            var e = this.blocks[g - 1];
            h = getBD(this.active_blocks[0]).div_bg;
            if (e) {
              this.active_blocks.splice(0, 0, e);
              if (!e.is_rendered) {
                e.renderBlock(0, true);
                var a = getBD(e).div_bg;
                var b = h.offsetLeft - a.offsetWidth;
                e.setLeft(b);
                e.renderPlurks(true, b);
                e.setVisibility(true)
              }
            }
          } else {
            if(!Poll.mode && TimeLine.notAtBegin > 0 && direction > 0){ //Poll.mode!=""時，表示目前在檢示新plurk or 新回應；河道開頭尚未讀到 direction > 0 表示是往右捲
              AJS.setSingleTimeout("getPlurks", function(){
                var prev_num_blocks;
                var endOffset = new Date(TimeLine.offset);
                prev_num_blocks = TimeLine.blocks.length;
                TimeLine.offset = new Date(TimeLine.plurks[0].posted);
                TimeLine.setOffsetForward();
                TimeLine.getPlurks(function(){
                  TimeLine.blocks = TimeLine.blocks.slice(prev_num_blocks).concat(TimeLine.blocks.slice(0,prev_num_blocks));
                  delete TimeLine.offset;
                  TimeLine.offset = new Date(endOffset);
                }, {addToTop:true});
              }, 300);
            }
          }
        }
      }
    };
    DisplayOptions.selectTab = function (c) {
      AJS.map(AJS.$bytc("a", null, AJS.$("filter_tab")), function (d) {
        if(d.id != "timeline_jumper_tab_btn")
          AJS.setClass(d, "off_tab");
      });
      AJS.setClass(c, "filter_selected bottom_line_bg");
      var b = "all";
      var a = c.id;
      switch (a) {
      case "own_plurks_tab_btn":
        b = "own";
        break;
      case "private_plurks_tab_btn":
        b = "private";
        break;
      case "responded_plurks_tab_btn":
        b = "responded";
        break;
      case "favorite_plurks_tab_btn":
        b = "favorite";
        break
      }
      DisplayOptions._setRightMode(b)
    };
    DisplayOptions.filterTimeline = function (a, b) {
      var stillJumper = false;
      if(AJS.$("timeline_jumper_tab_btn").className == "filter_selected"){
        TimeLine.saveJumperOffset(false);
      }
      Plurks.removeCurrentOpen();
      this.selectTab(b);
      this._filter();
      window.scrollTo(0, 0);
      return false
    };
    ////}}
    //{{ Custmize JS Function
    TimeLine.saveJumperOffset = function(forceSave){
      if(TimeLine.jumper_reset_offset && !forceSave) return;
      var t = TimeLine.getFirstActiveDate();
      if(t != null && !isNaN(t.getTime())){
        t.setMinutes(t.getMinutes()+2);
        TimeLine.jumper_reset_offset = t;
      } else if(forceSave){
        TimeLine.jumper_reset_offset = new Date();
      }
    };
    TimeLine.setOffsetForward = function(){
      var result;
      var t = TimeLine.jumper_user_ids;
      if((!t || (SiteState.getSessionUser() && ['|',t.join('|'),'|'].join('').indexOf(['|',SiteState.getSessionUser().uid,'|'].join('')) != -1)) &&   //如果是自己的河道，且在一週內
        (new Date()).getTime() - TimeLine.offset.getTime() < 86400000*7 &&          //且在一周內
        (!TimeLine.responded_only && !TimeLine.favorite_only && !TimeLine.private_only)){       //且不為特殊模式下
        TimeLine.offset = result = new Date(TimeLine.offset.getTime()+86400000); //往前一天
      } else {
        TimeLine.offset = result = new Date(TimeLine.offset.getTime()+86400000*7); //否則往前七天
      }
      return result;
    };
    SiteState.getUsersNickByIds = function(uids){
      var nicknameArray = [];
      AJS.map(uids, function(uid){
        var n;
        if(n = SiteState.getUserById(uid).nick_name){
          nicknameArray.push(n);
        }
      });
      return nicknameArray;
    };

    SiteState.getUserByNick = function (b) {
      var c = {};
      if (!window.FRIENDS) {
        return null;
      }
      if (window.COMPLETION) {
        AJS.update(c, COMPLETION);
      }
      AJS.update(c, USERS);
      AJS.update(c, FRIENDS);
      var a = AJS.map(AJS.keys(c), function (e) {
        var d = c[e];
        if (d.nick_name.toLowerCase() == b.toLowerCase()) {
          d.id = d.uid = e;
          return d;
        }
      });
      return a;
    };
    SiteState.getOtherUserByNick = function(nicknameArray, callback){
      var nicknameArray_unfetched = nicknameArray.length;
      var queryResult = function(nickname){
        return function(response){
          var match = response.exact_matches;
          if(match.length==0){
            alert(["喔喔！找不到使用者: ",nickname," 的資料0rz"].join(''));
          } else {
            for(var i=0; i < match.length; i++){
              if(match[i].nick_name.toLowerCase()==nickname.toLowerCase()){
                USERS[match[i].id] = match[i];
                break;
              }
            }
            if(i==match.length)
              alert(["喔喔！找不到使用者: ",nickname," 的資料0rz"].join(''));
          }
          if(--nicknameArray_unfetched == 0)
            callback();
        };
      };
      if(nicknameArray_unfetched == 0){
        callback();
      } else {
        for(var i = 0; i < nicknameArray.length; i++){
          if(!SiteState.getUserByNick(nicknameArray[i])){
            var b = AJS.loadJSON("/Search/queryUsers");
            var d = {
              q:nicknameArray[i]
            };
            b.addCallback(queryResult(d.q));
            b.sendReq(d);
          } else {
            if(--nicknameArray_unfetched == 0)
              callback();
          }
        }
      }
      
    };
    TimeLine.setJumperCache = function(user_ids, toDate){
      if(user_ids && toDate){
        TimeLine.jumper_cache = {
          toDate: TimeLine.dateToJumperFormat(new Date(toDate)),
          user_ids: [].concat(user_ids)
        }
      } else {
        TimeLine.jumper_cache = {
          toDate: TimeLine.dateToJumperFormat(new Date(TimeLine.getFirstActiveDate() || (new Date()))),
          user_ids: [].concat(TimeLine.jumper_user_ids)
        };
      }
    }
    TimeLine.jumper_close = function(reFetch){
      if(TimeLine.atBeginUid){
        delete TimeLine.notAtBegin;
        delete TimeLine.jumper_user_ids;
        delete TimeLine.atBeginUid;
        delete TimeLine.offset;
        delete TimeLine.jumper_reset_offset
        TimeLine.reset(false);
        if(reFetch){
          TimeLine.showLoading();
          TimeLine.getPlurks();
        }
        AJS.$("timeline_jumper_tab_btn").className = "off_tab";
        AJS.hideElement(AJS.$("timeline_jumper_close"));
      }
    };
    TimeLine.jumper = function(user_id, dateObj){
      TimeLine.reset(false);
      TimeLine.jumper_user_ids = [];
      switch (typeof user_id){
      case "string": case "number":
        TimeLine.jumper_user_ids.push(user_id);
        break;
      case "object":
        TimeLine.jumper_user_ids = [].concat(user_id);
        break;
      }
      TimeLine.notAtBegin = TimeLine.jumper_user_ids.length;
      TimeLine.atBeginUid = {};
      TimeLine.showLoading();
      TimeLine.getPlurks(function(){
        AJS.$("timeline_jumper_tab_btn").className = "filter_selected";
        AJS.showElement(AJS.$("timeline_jumper_close"));
        AJS.hideElement(AJS.$("timeline_jumper_tips"));
      }, {jumpTo: dateObj});
    };
    TimeLine.launchJumperByNicks = function(jump_to_users, toDate, onerror){
      onerror = onerror || function(){/*noop*/};
      var unknown_user = [];
      var jump_to_uids = [];
      var f;
      AJS.map(jump_to_users, function(nickname){
        if(!nickname.match(/^[a-zA-Z0-9\_\.]+$/)){
          alert([nickname, " 不是合法的plurker id"].join(''));
        } else if(f = SiteState.getUserByNick(nickname)){
          jump_to_uids.push(f.uid);
        } else if(SiteState.getSessionUser() && SiteState.getSessionUser().nick_name == nickname){
          jump_to_uids.push(SiteState.getSessionUser().uid);
        } else {
          unknown_user.push(nickname);
        }
      });
      if(unknown_user.length + jump_to_uids.length == 0) return onerror();
      TimeLine.showLoadingBlockAtBegin();
      SiteState.getOtherUserByNick(unknown_user, function(){
        TimeLine.removeLoadingBlock();
        AJS.map(unknown_user, function(nickname){
          var f;
          if(f = SiteState.getUserByNick(nickname)){
            jump_to_uids.push(f.uid);
          }
        });
        if(jump_to_uids.length > 0 && toDate){
          TimeLine.jumper(jump_to_uids, toDate);
        } else {
          return onerror();
        }
      });
    };
    TimeLine.showLoadingBlockAtBegin = function () {
      var c = TimeLine;
      var b = AJS.getFirst(c.active_blocks);
      if (b) {
        var a = getBD(b).div_bg;
        c.loading_div = AJS.DIV({
          c: "loading_div"
        }, c.loading_img);
        AJS.ACN(a, c.loading_div)
      }
    };
    TimeLine.getFirstActiveDate = function(){
      var b = TimeLine.active_blocks;
      for(var i = 0; b && i < b.length; i++){
        if(b[i].plurks && b[i].plurks[0]){
          return b[i].plurks[0].posted;
        }
      }
      return null;
    };
    TimeLine.dateToJumperFormat = function(t){
      var Y = t.getYear()+(t.getYear()<1000?1900:0);
      var m = t.getMonth()+1; if(m<10) m = "0" + m;
      var d = t.getDate();  if(d<10) d = "0" + d;
      var H = t.getHours(); if(H<10) H = "0" + H;
      var i = t.getMinutes(); if(i<10) i = "0" + i;
      var s = t.getSeconds(); if(s<10) s = "0" + s;
      var result = [Y,"/",m,"/",d," ",H,":",i,":",s].join('');
      if(isNaN(new Date(result).getTime())){
        return null;
      } else {
        return result;
      }
    };
    ////}}
    var jumperTabSpan;
    var uniqueArray = function(a){
      for(var i = 0; i < a.length -1; i++){
        for(var j = i+1; j < a.length; j++){
          if(a[i] == a[j]){
            a.splice(j--, 1);
          }
        }
      }
    };
    if(!AJS.$("filter_tab") && AJS.$("dashboard_holder")){
      jQuery(AJS.UL({id:"filter_tab"})).insertBefore(AJS.$("dashboard_holder"));
    }
    AJS.ACN(AJS.$("filter_tab"), AJS.LI({}, AJS.A({id:"timeline_jumper_tab_btn", s:"cursor:pointer", c:"off_tab"}, 
      jumperTabSpan = AJS.SPAN({}, "河道任意門") ,
      AJS.SPAN({id:"timeline_jumper_tips", s:"display:none"}, "(", AJS.SPAN({s:"opacity:0.7" }, "回復"), ")"),
      AJS.SPAN({id:"timeline_jumper_close", s:"display:none"}, "(", AJS.SPAN({ c:"unread_generic"}, "關閉"), ")")
    )));
    if(AJS.$("toggle_tab") && AJS.$("toggle_tab").getElementsByTagName("li")){
      var search_tab_icon = AJS.$("toggle_tab").getElementsByTagName("li")[1];
      search_tab_icon.onclick = function(){
        TimeLine.saveJumperOffset(true);
        PlurkSearch.showPane(this, 'search');
      };
    }

    AJS.AEV(jumperTabSpan, "click", function(e){
      var t = TimeLine.getFirstActiveDate();
      t = t || (new Date());
      t.setMinutes(t.getMinutes()+2);
      var toDate = prompt(["請輸入要跳到河道的哪個時間點？\n",
               "\t時間格式範例：2011/05/05 23:09:02\n",
               "\t您也可以直接輸入 now 跳到目前的時間點"].join('')
             , TimeLine.dateToJumperFormat(t));
      if(!toDate) return;
      if(toDate == "now"){ 
        toDate = TimeLine.dateToJumperFormat(new Date());
      } else {
        toDate = TimeLine.dateToJumperFormat(new Date(toDate));
      }
      var jump_to_users = prompt(["請輸入要跳到哪個人or哪些人的河道？\n",
                "\t您可以輸入一至多個id，並用空白字元分開\n",
                "\t例如：",SiteState.getPageUser().nick_name," grass7boy\n\n",
                "備註：由於當河道捲到七天以前，您的朋友的噗並不會顯示在您的河道上，\n",
                "因此您可以透過輸入多個朋友id，一次在河道上顯示他們以前的噗\n",
                "(但若您的網路速度較慢，輸入過多id可能會影響河道的顯示速度 ^^~)"].join(''),
                SiteState.getUsersNickByIds(TimeLine.jumper_user_ids).join(' '));
      if(!jump_to_users) return;

      jump_to_users = jump_to_users.split(/[\s]+/);
      uniqueArray(jump_to_users);
      TimeLine.launchJumperByNicks(jump_to_users, toDate);
    });
    AJS.AEV(AJS.$("timeline_jumper_close"), "click", function(){
      alert("取消河道任意門模式...");
      TimeLine.jumper_close(true);
    });
    AJS.AEV(AJS.$("timeline_jumper_tips"), "click", function(){
      var t = TimeLine.jumper_cache;
      TimeLine.jumper(t.user_ids, t.toDate);
      AJS.hideElement(AJS.$("timeline_jumper_tips"));     
    });
    var timer;

    var pure_location = location.href.replace(/#[\d\D]*$/, "");
    var hash = null;
    setConfig = function(hash){/*noop*/};
    if(localStorage){ // localStorage supports
      hash = (function(){
        var hash = localStorage._gTJhash || null;
        var result = null;
        if(!hash){
          return null;
        } else {
          var hash = hash.split('|');
          for(var i = 0 ; i < hash.length; i++){
            var t = hash[i].split('~');
            if(pure_location == t[0].split('#')[0]){
              result =  '#'+t[0].split('#')[1];
              hash.splice(i--, 1);
            } else if(t[1] && parseInt(t[1]) < (new Date()).getTime()-3600000){
              hash.splice(i--, 1);
            }
          }
        }
        localStorage._gTJhash = hash.join('|');
        return result;
      })();
      setConfig = function(h){
        var hash = localStorage._gTJhash || null;
        var saveValue = [pure_location, h, '~', (new Date()).getTime()].join('');
        if(!hash){
          hash = [saveValue];
        } else {
          hash = hash.split('|');
          for(var i = 0 ; i < hash.length; i++){
            var t = hash[i].split('~');
            if(pure_location == t[0].split('#')[0]){
              hash.splice(i--, 1);
            }
          }
          hash.push(saveValue);
        }
        localStorage._gTJhash = hash.join('|');
      };
    }
    if(hash){
      location.hash = hash;
    }


    AJS.AEV(window, "beforeunload", function(){
      clearInterval(timer);
      var d = TimeLine.getFirstActiveDate();
      if(!d) return;

      var now_time = TimeLine.dateToJumperFormat(d);
      var uids = TimeLine.jumper_user_ids ;
      if(uids && now_time){
        var hash = ["#jumper:", uids.join(","),"@", (new Date(now_time)).getTime()].join('');
        if(!localStorage){ 
          location.hash = hash;
        } else {
          setConfig(hash);
        }
      }
    });
    var check_hash = function(rightNow){
      var h = location.hash.toString();
      if(h.indexOf("#jumper:")!=-1){
        location.hash = "#";
        var uids = h.match(/#jumper:([0-9\,]+)@/) || h.match(/#jumper:([0-9\,]+)$/);
        var time = h.match(/#jumper:[^@]*\@([^@]+)$/);
        var nicks = h.match(/#jumper:([a-zA-Z0-9\,\_\.]+)/);
        if(nicks && !nicks[1].match(/^[0-9\,]+$/)){ //如果只由數字、逗點組成，則表示不為nickname
          nicks = nicks[1].split(/[\s]*,[\s]*/);
          uniqueArray(nicks);
          time = (time && (time[1].match(/^[\d]+$/)?(new Date(parseInt(time[1]))):(new Date(time[1]))) ) || new Date();
          TimeLine.launchJumperByNicks(nicks, time);
          return;
        }
        if(time || uids){
          uids = (uids && uids[1].split(',')) || [SiteState.getPageUser().uid];
          uniqueArray(uids);
          time = (time && (time[1].match(/^[\d]+$/)?(new Date(parseInt(time[1]))):(new Date(time[1]))) ) || new Date();
          TimeLine.setJumperCache(uids, time);
          var t = TimeLine.jumper_cache;
          if(rightNow){
            var p_tab = AJS.$("plurks_pane_li");
            if(p_tab && p_tab.className != "tt_selected"){ //in search mode
              PlurkSearch.showPane(p_tab, 'plurk', true);
              delete TimeLine.jumper_reset_offset; //delete cached reset_offset
            }
            TimeLine.jumper(t.user_ids, t.toDate);
          } else {
            AJS.showElement(AJS.$("timeline_jumper_tips"));
          }
        }
      }
      delete h;
    };
    
    InfoOverlay.menu.addItems(createSeparator());
    InfoOverlay.menu.addItems(createItem(AJS.DIV("將目前河道變成此Plurker的河道"), AJS.$b(function(){
      var a = this.user;
      if(confirm(["河道任意門 通知：\n", 
          "\t河道即將顯示 ", a.nick_name, " 的河道內容\n",
          "\t您要繼續嗎？"].join(''))){
        if($dp.current_div)Plurks._removeExpand(false);
        location.hash = ["#jumper:", a.uid, "@", (new Date()).getTime()].join('');
      }
    }, InfoOverlay)));
    InfoOverlay.menu.addItems(createItem(AJS.DIV("合併顯示此Plurker的河道"), AJS.$b(function(){
      var a = this.user;
      var len = TimeLine.jumper_user_ids.length;
      var nicknameArray = SiteState.getUsersNickByIds(TimeLine.jumper_user_ids.concat([a.uid]));
      uniqueArray(nicknameArray);
      if(nicknameArray.length == len){
        alert("此Plurker的河道已經合併顯示在河道上了...");
        return;
      }
      if(confirm(["河道任意門 通知：\n", 
          "\t河道即將合併顯示 ", nicknameArray.join(', '), " 的河道\n",
          "\t(若您的網路速度較慢，合併顯示過多河道可能會影響河道的顯示速度 ^^~)\n\n",
          "\t您要繼續嗎？"].join(''))){
        var t = TimeLine.jumper_reset_offset || TimeLine.getFirstActiveDate() || new Date();
        t.setMinutes(t.getMinutes()+2);
        TimeLine.jumper_user_ids.push(a.uid);
        if($dp.current_div)Plurks._removeExpand(false);
        location.hash = ["#jumper:", TimeLine.jumper_user_ids.join(','), "@", t.getTime()].join('');
      }
    }, InfoOverlay)));
    InfoOverlay.menu.addItems(createItem(AJS.DIV("跳至此Plurker(剛註冊時)的河道源頭"), AJS.$b(function(){
      var _self = this;
      var a = this.user;
      AJS.showElement(this.loading);
      AJS.hideElement(this.up);

      var x = AJS.getRequest(a.nick_name,"GET");
      x.addCallback(function(response){
        var match = response.match(/segment\-content[\d\D]+?dash\-stat[\d\D]+?([\d]{4}-[\d]{1,2}-[\d]{1,2})/);
        AJS.showElement(_self.up);
        AJS.hideElement(_self.loading);
        console.log(match[1], match[1].replace(/\-/g,"/"));

        var since_date = new Date(match && match[1].replace(/\-/g,"/"));

        if(!isNaN(since_date.getTime())){
          since_date.setDate(since_date.getDate()+7);
          if(confirm(["河道任意門 通知：\n", 
              "\t河道即將跳至 ", a.nick_name, " 剛註冊一週的時間點\n",
              "\t也就是：", TimeLine.dateToJumperFormat(since_date),"\n\n",
              "\t您要繼續嗎？"].join(''))){
            if($dp.current_div)Plurks._removeExpand(false);
            location.hash = ["#jumper:", a.uid, "@", since_date.getTime()].join('');
          }
        } else {
          alert([ "取得 ",a.nick_name," 註冊的時間失敗…\n",
            "因此這個功能無效0rz..."].join(''));
        }
      });
      x.sendReq();
    }, InfoOverlay)));
    InfoOverlay.menu.addItems(createItem(AJS.DIV("將河道時間定位到這則噗的發表時間"), AJS.$b(function(){
      var plurk_elm = this.elm.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode;
      var p_obj;
      var type;
      while(!(p_obj = getPD(plurk_elm))){
        plurk_elm = plurk_elm.parentNode;
        if(!plurk_elm) break;
      }
      if(!p_obj) alert("找不到這則噗的資料0rz");
      if(p_obj.div.id.match(/m[\d+]/)){
        type = "回應";
      } else if(p_obj.div.id.match(/p[\d+]/)) {
        type = "噗";
      }
      if(confirm(["河道任意門 通知：\n", 
          "\t河道即將跳至這則", type, "發表的時間點\n",
          "\t也就是：", TimeLine.dateToJumperFormat(p_obj.obj.posted),"\n\n",
          "\t您要繼續嗎？"].join(''))){
        if($dp.current_div)Plurks._removeExpand(false);
        location.hash = ["#jumper:", TimeLine.jumper_user_ids.join(','), "@", p_obj.obj.posted.getTime()].join('');
      }

    }, InfoOverlay)));
    check_hash(false);
    timer = setInterval(function(){
      check_hash(true);
    }, 300);
    if(!TimeLine.jumper_user_ids){
      TimeLine.jumper_user_ids = [SiteState.getPageUser().uid];
    }
  };
  ////}}
  TimeLineJumperInit();
})();
PlurkSearch = {
  has_more: true,
  init: function () {
    SETTINGS = {};
    FRIENDS = {};
    FANS = {};
    TimeLine.getPlurks = PlurkSearch._getPlurks
  },
  query: function (a) {
    AJS.$("current_query").value = a;
    PlurkSearch.current_query = a;
    var b = AJS.urlencode(a.replace(/\s+/g, "+"));
    b = b.replace(/%2B/, "+");
    if (window.location.toString().indexOf("psearch") != -1) {
      window.location.hash = "q=" + b
    }
    PlurkSearch.has_more = true;
    PlurkSearch.offset = null;
    Plurks.removeCurrentOpen();
    TimeLine.reset();
    TimeLine.getPlurks();
    window.scrollTo(0, 0);
    return false
  },
  ajaxSearch: function () {
    var a = AJS.$("current_query").value;
    PlurkSearch.query(a);
    _gaq.push(["_trackEvent", "Search_plurk", "keypress_enter", a]);
    return false
  },
  showStartMessage: function () {
    TimeLine.renderText(_("Search Plurk and find out what's happening RIGHT now."))
  },
  showPane: function (c, a, notReload) {
    var d = AJS.$gc(AJS.$gp(c, "ul"), "li", "tt_selected");
    AJS.removeClass(d, "tt_selected");
    AJS.addClass(c, "tt_selected");
    AJS.hideElement(AJS.$bytc(null, "pane"));
    AJS.showElement(AJS.$("pane_" + a));
    if (a == "search") {
      Plurks.removeCurrentOpen();
      var b = AJS.$("current_query");
      AJS.$("current_query").focus();
      AJS.setVisibility(AJS.$("filter_tab"), false);
      if (!PlurkSearch.old_getPlurks) {
        PlurkSearch.old_getPlurks = TimeLine.getPlurks
      }
      TimeLine.getPlurks = PlurkSearch._getPlurks;
      if (PlurkSearch.current_query) {
        PlurkSearch.query(PlurkSearch.current_query)
      } else {
        TimeLine.reset();
        PlurkSearch.showStartMessage()
      }
      AJS.setVisibility(AJS.$("updater"), false)
    } else {
      if (TimeLine.getPlurks != PlurkSearch.old_getPlurks && PlurkSearch.old_getPlurks) {
        TimeLine.getPlurks = PlurkSearch.old_getPlurks;
        AJS.setVisibility(AJS.$("filter_tab"), true);
        if(!notReload){
          AJS.$bytc("a", "filter_selected")[0].onclick();
        }
        AJS.setVisibility(AJS.$("updater"), true)
      }
    }
    PlurkSearch.current_pane = a
  },
  updateShareLink: function () {
  },
  showTrends: function (a) {
    a = a.replace(/"/g, "%22");
    return GB_showCenter(_("Plurk trends"), "/ptrends?q=" + a, 700, 550)
  },
  showTrendGraph: function (b) {
    var a = AJS.$gc(b, "a", "trend_graph");
    AJS.setVisibility(a, true)
  },
  hideTrendGraph: function (b) {
    var a = AJS.$gc(b, "a", "trend_graph");
    AJS.setVisibility(a, false)
  },
  _getPlurks: function () {
    var b = PlurkSearch;
    if (b.getting_plurks || !b.has_more) {
      return
    }
    if (TimeLine.plurks.length > 0) {
      TimeLine.showLoadingBlock()
    }
    var a = AJS.loadJSON("/Search/query");
    TimeLine.removeEmpty();
    if (TimeLine.plurks.length > 0) {
      TimeLine.showLoadingBlock()
    } else {
      TimeLine.showLoading()
    }
    b.getting_plurks = true;
    a.addCallback(function (d) {
      b.has_more = d.has_more;
      b.getting_plurks = false;
      TimeLine.hideLoading();
      if (d.error) {
        TimeLine.renderText(_("An unknown error happened."))
      } else {
        if (b.has_more) {
          b.offset = d.last_offset
        }
        AJS.update(USERS, d.users);
        try {
          TimeLine._plurksFetched(d.plurks)
        } catch (f) {
          AJS.log(f)
        }
      }
    });
    a.addErrback(function () {
      b.getting_plurks = false;
      TimeLine.hideLoading();
      TimeLine.renderText(_("An unknown error happened."))
    });
    var c = {
      query: b.current_query
    };
    if (b.offset) {
      c.offset = b.offset
    }
    a.sendReq(c)
  }
};
//}}whole TimeLine jumper (End)
try {window.FRIENDS;} catch (e) {window.FRIENDS = null;}
if(window.FRIENDS != null && SiteState.canEdit()){
  (function () {
    var loadScript = function(src, scriptID){
      var new_script = document.createElement("script");
      new_script.id = scriptID || ("new_script"+(new Date()).getTime()); 
      new_script.src = src;
      document.getElementsByTagName("head")[0].appendChild(new_script);
      return new_script.id;
    };
    window.fbAsyncInit = function () {
      FB.init({
        appId: '142534085764122', 
        status: true,
        cookie: true,
        xfbml: true
      });
      FB.Event.subscribe('auth.logout', function(response) {
        location.reload();
      });
      FB.getLoginStatus(function(response){
        if(response.authResponse){
          if (!FB.getUser && !FB.userInfo && FB.getAuthResponse()) {
            initializeFBinPlurk();
          }
        }
      });
    }
    var panel_tabs = jQuery("<ul style=\"\" id=\"toggle_tab\"><li id=\"plurks_pane_li\" onclick=\"PlurkSearch.showPane(this, 'plurk')\" class=\"tt_selected\">Plurk</li><li onclick=\"PlurkSearch.showPane(this, 'search')\">搜尋</li></ul>").prependTo('#dashboard_holder');
    var new_li = AJS.SPAN({id: "fipLoginButton", style:"vertical-align:middle;display: inline-block; width: 100px; height:22px; overflow: hidden;"});
    new_li.innerHTML = '<fb:login-button scope="manage_notifications,read_friendlists,user_photos,user_videos,publish_stream,read_stream,friends_status,user_status,photo_upload" autologoutlink="true"></fb:login-button>';
    var new_li2 = AJS.SPAN({id: "fipStatus"});
    new_li2.innerHTML = '<a href="http://www.plurk.com/p/75f5hn" target="_blank" style="font-size:12px;"><img  style="vertical-align:middle;margin:2px;" src="http://grassboy.tw/fbTools/about.png" onmouseout="return AmiTooltip.hide()" onmouseover="return AmiTooltip.show(this, AJS.DIV({c: \'tooltip_cnt\'}, AJS.IMG({style:\'border:none;\',src:\'http://grassboy.tw/fbTools/about-48.png\'}), AJS.B(\'關於Facebook in Plurk~~ (請按我見說明)\')), event)" /></a>';
    
    panel_tabs.append(new_li);
    panel_tabs.append(new_li2);
    var new_div = document.createElement("div");
    new_div.id = "fb-root";
    document.body.appendChild(new_div);

      (function(d){
         var js, id = 'facebook-jssdk'; if (d.getElementById(id)) {return;}
         js = d.createElement('script'); js.id = id; js.async = true;
         js.src = "//connect.facebook.net/zh_TW/all.js";
         d.getElementsByTagName('head')[0].appendChild(js);
       }(document));

    loadScript("http://grassboy.tw/plurkTool/plurk_trend/getTrend.js");
  }());
//{{ FacebookInPlurk主程式
  function initializeFBinPlurk(){
    FB.fipListLimit = [];
    FB.fipInReMode = false;
    FB.userInfo = {
      unknown: {
        uid: 0,
        name: "(未知使用者)",
        pic_square: "http://www.plurk.com/static/default_small.gif"
      }
    };
    FB.Data.query = (function(){
      var FQLQuery = function(query_str){
        this.query_str = query_str;
      };
      FQLQuery.prototype = {
        constructor: FQLQuery,
        wait: function(success, error){
          var self = this;
          success = success || function(){
            console.dir(arguments);
          };
          error = error || function(){
            console.dir(arguments);
          };
          //console.log("query> "+ self.query_str);
          FB.api('/fql', 'get',{
            q: self.query_str
          }, function(response) {
            if(response.error){
              //console.log("error> "+ self.query_str);
              error(response.error);
            } else if(response.data){
              //console.log("success> "+ self.query_str);
              success(response.data);
            }
          });
        }
      };
      return function(){
        var args = arguments;
        var query = args[0];
        query = query.replace(/\{([\d]+)\}/g, function(matched, $1){
          return(args[parseInt($1)+1]);
        });
        return (new FQLQuery(query));
      };
    })();
    var query = FB.Data.query('SELECT uid, name, pic_square FROM user WHERE uid IN(SELECT uid FROM status WHERE uid IN (SELECT uid2 FROM friend WHERE uid1= {0}) ) OR uid = {1}', FB.getAuthResponse().userID, FB.getAuthResponse().userID);
    var initializeFBinPlurk_callback = function (rows) {
      for (var i = 0; i < rows.length; i++) {
        FB.userInfo["p" + rows[i].uid] = {
          uid: rows[i].uid,
          name: rows[i].name,
          pic_square: rows[i].pic_square
        };
      }
    };
    query.wait(initializeFBinPlurk_callback, function(){initializeFBinPlurk_callback([]);});
    //{{ 取得FBUserData並Cache下來
    FB.getUser = function (uid, cb_func) {
      if (FB.userInfo["p" + uid]) {
        return FB.userInfo["p" + uid];
      } else {
        var query = FB.Data.query('SELECT uid, username, name, pic_square FROM user WHERE uid={0} ', uid);
        if (cb_func) {
          var initializeFBinPlurk_callback2 = function (rows) {
            if (rows.length > 0) {
              FB.userInfo["p" + rows[0].uid] = {
                uid: rows[0].uid,
                name: rows[0].name,
                pic_square: rows[0].pic_square != null ? rows[0].pic_square : (rows[0].pic_square = "http://www.plurk.com/static/default_small.gif")
              };
              cb_func(rows);
            }
          };
          query.wait(initializeFBinPlurk_callback2, function(){initializeFBinPlurk_callback2([]);});
        } else {
          var initializeFBinPlurk_callback3 = function (rows) {
            if (rows.length > 0) {
              FB.userInfo["p" + rows[0].uid] = {
                uid: rows[0].uid,
                name: rows[0].name,
                pic_square: rows[0].pic_square != null ? rows[0].pic_square : (rows[0].pic_square = "http://www.plurk.com/static/default_small.gif")
              };
            }
          };
          query.wait(initializeFBinPlurk_callback3, function(){initializeFBinPlurk_callback3([]);});
        }
        return FB.userInfo["unknown"];
      }
    };
    ////}}

    /*****************************************************/
    Plurks.cur_plurkers = []; /*this is dirty hack*/
    AJS.$ = function(a) {
      if(a=="facebook_sync" && MoreOptions.fip_sync){
        return {checked:false};
      } else {
        if (AJS.isString(a) || AJS.isNumber(a)) {
          return document.getElementById(a);
        } else {
          return a;
        }
      }
    };
    PlurkAdder._fip2FBerror = function(msg){
      if(msg) alert("Facebook in Plurk同步訊息至Facebook失敗，\n現在將關閉Facebook in Plurk的同步功能\n\n詳細訊息："+msg);
      localStorage._gFIP2FB = null;
      delete localStorage._gFIP2FB;
      MoreOptions.fip_sync = false;
    };
    PlurkAdder._fip2FB = function(plurk){
      if (!(FB && FB.getAuthResponse())){
        PlurkAdder._fip2FBerror("Facebook帳號未登入or未授權");
      }
      if (AJS.isString(plurk.posted)) {
        plurk.posted = new Date(plurk.posted)
      }
      if(localStorage._gFIP2FB=="yes"){
        if (!(MoreOptions.facebook_by_fip && !MoreOptions.facebook_by_fip.checked)) {
          if(!plurk.limited_to){
            var args = {
              message: plurk.content_raw,
              actions: [{name: "觀看Plurk上的回應",link:'http://plurk.com/p/' + parseInt(plurk.id).toString(36)}]
            };
            var url_checker = plurk.content.match(/<a [^>]*href[\s]*=[\s]*[\'\"]([^\'\"]+)[\'\"][^>]*>/);
            if(url_checker){
              var url = url_checker[1];
              if(url.match(/[^\/]+?\.(jpg|jpeg|gif|png)$/i)){
                var getWallAlbumId = function(callback){
                  if(localStorage._gFIPWallAlbumId){
                    callback(localStorage._gFIPWallAlbumId);
                  } else {
                    FB.api('/me/albums', 'get', function (response) {
                      if(fipHasError(response)) return;
                      if (!response || response.error) {
                        delete localStorage._gFIPWallAlbumId;
                        PlurkAdder._fip2FBerror(["API發生錯誤 (",response.error.message,")"].join(''));
                      }
                      for(var i = 0; i < response.data.length; i++){
                        var album = response.data[i];
                        if(album.type=="wall"){
                          localStorage._gFIPWallAlbumId = album.id;
                          callback(localStorage._gFIPWallAlbumId);
                          return;
                        }
                      }
                      callback(null);
                    });
                  }
                };
                var addToWallAlbum = function(plurk, args){
                  getWallAlbumId(function(wall_album_id){
                    var target;
                    if(wall_album_id === null){
                      target = "/me/feed";
                      args.picture = url;
                      delete args.url;
                    } else {
                      target = '/'+wall_album_id+'/photos';
                      args.message += (' - http://plurk.com/p/' + parseInt(plurk.id).toString(36));
                    }
                    FB.api(target, 'post', args, function (response) {
                      if(fipHasError(response)) return;
                      if (!response || response.error) {
                        delete localStorage._gFIPWallAlbumId;
                        PlurkAdder._fip2FBerror(["API發生錯誤 (",response.error.message,")"].join(''));
                      }
                      if(response && response.id){
                        plurk.fip_sync_id = response.id;
                      }
                    });
                  });
                }
                args.url = url;
                addToWallAlbum(plurk, args);
                return;
              } else {
                args.link = url;
              }
            }
            FB.api('/' + FB.getAuthResponse().userID + '/feed', 'post', args, function (response) {
              if(fipHasError(response)) return;
              if (!response || response.error) {
                PlurkAdder._fip2FBerror(["API發生錯誤 (",response.error.message,")"].join(''));
              }
              if(response && response.id){
                plurk.fip_sync_id = response.id;
              }
            });
          }
          if(MoreOptions.facebook_by_fip) MoreOptions.facebook_by_fip.checked = true;
        }
      }
    };
    if(localStorage._gFIP2FB == "yes"){
      if(FB && FB.getAuthResponse()){
        MoreOptions.fip_sync = true;
        eval("var t_func = " + PlurkAdder._plurkAdded.toString().replace("{", "{var posted_p=arguments[2].plurk; PlurkAdder._fip2FB(posted_p);"));
        PlurkAdder._plurkAdded = t_func;
      } else {
        PlurkAdder._fip2FBerror("Facebook帳號未登入or未授權");
      }
    }

    PlurkPoster.showSyncForm = function () {
      var d = AJS.$("sync_checked_form");
      if (d) {
        d.style.display = "block"
      } else {
        AJS.ACN(AJS.$("sync_checked_holder"), PlurkPoster._renderSyncCheckbox())
        var to_fb_fip, to_fb_default;
        AJS.ACN(AJS.$("sync_checked_ul"), AJS.LI(to_fb_default = AJS.INPUT({
          onclick: "localStorage._gFIP2FB=null;delete localStorage._gFIP2FB; MoreOptions.fip_sync = false",
          type: "radio",
          name: "how_to_fb",
          id: "to_fb_default"
        }), AJS.LABEL({
          "for": "to_fb_default"
        }, " 透過Plurk官方同步至Facebook")), AJS.LI(to_fb_fip = AJS.INPUT({
          onclick: "localStorage._gFIP2FB='yes'; MoreOptions.facebook_by_fip = document.getElementById('facebook_sync'); MoreOptions.fip_sync = true;",
          type: "radio",
          name: "how_to_fb",
          id: "to_fb_fip"
        }), AJS.LABEL({
          "for": "to_fb_fip"
        }, " 透過Facebook in Plurk同步至Facebook")));
        
        if(localStorage._gFIP2FB == "yes"){
          MoreOptions.fip_sync = true;
          MoreOptions.facebook_by_fip = document.getElementById('facebook_sync');
          to_fb_fip.checked = "checked";
        } else {
          to_fb_default.checked = "checked";
        }
      }
      var a = jQuery(".cmp_sync_on");
      var c = a.parents(".iframe_holder");
      if (c.length) {
        var b = a.offset().top - c.offset().top + 36 + 100;
        if (c.height() < b) {
          c.height(b)
        }
      }
      PlurkPoster.syncShown = 1
    };

    PlurkAdder.plurkResponse = function (e, g, j) {
      //{{ start hack of fip: c 為我定出來的變數如果之後 噗浪有定義 c 這裡的 c 就要換掉
      var c = getPD($dp.current_div).obj;
      var a = GLOBAL.session_user.default_lang || "en";
      var fb_mode = c.fb_uid ? true : false;
      var fip_sync_id = c.fip_sync_id || null;
      ////}}
      if (e.disabled || e.value.length == 0 || MaxChar.calculateContentLength(e.value, a) > 210) {
        return false
      }
      var d = AJS.serializeJSON(new Date());
      var f = e.value;
      var g = Qualifiers.getQual(g);
      var b = Qualifiers.transformContentQualifer(g, f, a);
      g = b[0];
      f = b[1];
      f = PlurkAdder.resolveNickNames(f);
      PlurkAdder.posting = true;
      e.disabled = true;
      AJS.setHTML(AJS.$("input_small_cu"), '<span style="color: black">' + _("Plurking response...") + "</span>");
      //{{ start hack of fip: c 為 第一行的 c, e為此 function 第一個參數 e, 
      if (fb_mode) {
        FB.api('/' + c.fb_post_id + '/comments', 'post', {
          message: e.value
        }, function (response) {
          if(fipHasError(response)) return;
          if (!response || response.error) {
            alert('Error occured');
          } else {
            var responsedData = {
              "object": {
                "lang": GLOBAL.session_user.default_lang,
                "content_raw": e.value,
                "user_id": SETTINGS.user_id,
                "qualifier": "says",
                "plurk_id": c.plurk_id,
                "content": e.value,
                "id": response.id,
                "posted": new Date(),
                "fb_uid": FB.getAuthResponse().userID
              },
              "last_ts": 0
            };
            PlurkAdder._responseAdded(e, null, responsedData);
          }
        });
        return false;
      }
      ////}}
      var h = AJS.loadJSON("/Responses/add");
      h.addCallback(AJS.$p(PlurkAdder._responseAdded, e, j));
      //{{ start hack of fip: e 為第一個參數 e
      if(!fb_mode && fip_sync_id) {
        var fip_sync_icon = AJS.$("fip_sync_icon");
        if(fip_sync_icon && AJS.hasClass( fip_sync_icon, "enable") && fip_sync_icon.style.display != "none"){
          FB.api('/' + fip_sync_id + '/comments', 'post', {
            message: e.value
          }, function (response) {
            if(fipHasError(response)) return;
            if (!response || response.error) {
              alert('Response to Facebook Error occured');
            }
          });
        }
      }
      ////}}
      h.addErrback(PlurkAdder._antiSpamErrors);
      h.addErrback(function (m, l) {
        if (m == "not-logged-in") {
          alert(_("It seems that your login session has expired. Please login again"));
          window.location = "/Users/showLogin";
          return
        }
        if (l.status == 400) {} else {
          if (l.status == 404) {
            AJS.RCN($dp.list, AJS.DIV({
              c: "empty",
              s: "color: red"
            }, _("This plurk seems to be deleted.")))
          } else {
            if (l.status == 403) {
              AJS.RCN($dp.list, AJS.DIV({
                c: "empty",
                s: "color: red"
              }, _("You don't have permission for this."), AJS.BR(), AJS.setHTML(AJS.SPAN(), m.substring(0, 200))))
            } else {
              AJS.RCN($dp.list, AJS.DIV({
                c: "empty",
                s: "color: red"
              }, _("An unknown error happened.")))
            }
          }
        }
        AJS.setHTML(AJS.$("input_small_cu"), format(_("%s characters left"), 210));
        Plurks.poster.input.disabled = true;
        e.disabled = false;
        e.focus()
      });
      if (g == "freestyle") {
        g = ":"
      }
      var c = getPD($dp.current_div).obj;
      h.sendReq({
        posted: d,
        qualifier: g,
        content: f,
        p_uid: c.owner_id,
        plurk_id: c.plurk_id,
        replurker_id: c.replurker_id,
        lang: a,
        uid: SiteState.getSessionUser().id
      });
      return false
    };
    Responses.responseMouseOver = function (b) {
      if (Responses.mouseTO) {
        clearTimeout(Responses.mouseTO);
        Responses._responseMouseOut()
      }
      var e = getPD(b).obj;
      //{{ start of fbinplurk hack: e 為前一行的 e 
      var fb_mode = e.fb_uid ? true : false;
      ////}}
      var d = Plurk.getById(e.plurk_id);
      var f = e.posted;
      var g = "@ " + Cal.formatMonthDate(f) + " - " + Cal.formatTime(f.getHours(), f.getMinutes());
      var h, c = null;
      var a = null;
      if (SiteState.getSessionUser()) {
        a = SiteState.getSessionUser().id
      }
      var o = (e.user_id == a) || e.my_anonymous;
      var j = d.owner_id == a || d.my_anonymous;
      //{{  start of fbiplurk hack: 直接複制即可
      var delFBcomment = function (e, d, b) {
        var eid = e.id;
        if (confirm(_("Are you sure you want to delete this response?"))) {
          FB.api('/' + eid, 'delete', {}, function (response) {
            if(fipHasError(response)) return;
            if (!response || response.error) {
              alert('Error occured');
            } else {
              var a = getPD(d).obj;
              AJS.removeElement(d);
              Responses._responseMouseOut();
              ResponseCache.removeFromCache(a);
              var e = Plurk.getById(a.plurk_id);
              if (e) {
                e.response_count--;
                var f = AJS.$("p" + e.plurk_id);
                AJS.setHTML(getPD(f).response_count, "" + e.response_count)
              }
            }
          });
        }
      };
      ////}}
      //{{  start of fbiplurk hack: 與 if (o || j) block 結合 e 為一開始的 e
      if ((fb_mode && e.fb_uid == FB.getAuthResponse().userID) || (!fb_mode && (o || j))) {
        h = AJS.A({
          c: "resp_icon del_icon",
          title: _("delete this response")
        }, _("delete"));
        AJS.AEV(h, "click", fb_mode ? AJS.$p(delFBcomment, e, b, h) : AJS.$p(Responses.deleteResponse, b, h));
      }
      ////}}
      //{{  start of fbiplurk hack: 與 if (!o) block 結合: e 為 getPD 時的 e
      if (!o 
          && !fb_mode || (fb_mode && e.fb_uid != FB.getAuthResponse().userID)
      ) {
        c = AJS.A({
          c: "reply_to",
          title: _("reply to this person")
        }, _("reply"));
        AJS.AEV(c, "click", function () {
          var r = AJS.$("m" + e.id).getElementsByTagName("a")[0];
          var p = r.getAttribute("href", 2).substring(1);
          var q = AJS.$("input_small").value;
          if (q && q[q.length - 1] != " ") {
            q += " "
          }
          if (p == "anonymous") {
            p = r.innerHTML;
            q = q + p + ": " + q + "~"
          } else {
            q = q + "@" + p + ": ~"
          }
          AJS.$("input_small").value = "";
          InputUtil.insertAtCursor(AJS.$("input_small"), q)
        })
      }
      ////}}
      var m = AJS.DIV({
        c: "response_time plurk_cnt"
      }, AJS.DIV({
        c: "holder"
      }, AJS.P(g), AJS.BR(), c, h));
      var n = AJS.absolutePosition(b);
      n.x += $dp.holder.offsetWidth - 6;
      var l = AJS.$gp(b, "div", "list");
      n.y -= l && l.scrollTop || 0;
      AJS.setStyle(m, {
        top: n.y,
        left: n.x
      });
      AJS.ACN(AJS.getBody(), m);
      AJS.AEV(m, "mouseover", function () {
        if (Responses.mouseTO) {
          clearTimeout(Responses.mouseTO)
        }
      });
      return false
    };
    //{{ Whole ListAll (Start)
    Plurks._renderListAllIcon = function(userlist, title, tips){
      var list_all_icon = AJS.A({title:title, s:"cursor:pointer;"},"\u226b");
      AJS.AEV(list_all_icon, "click", function(ev){
        AJS.stopPropagation(ev);
        AJS.preventDefault(ev);
        GB_showCenter(title, "about:blank", 200, 300);
        var list_all = function(){
          try {
            var blank_iframe = AJS.$("settingFrame").contentWindow.document.getElementById("GB_frame");
            var blank_window = blank_iframe.contentWindow;
          } catch(e){
            setTimeout( list_all, 1000);
            return;
          }

          blank_window.loading_icon = AJS.DIV({
            s: "height:130px; margin:auto; text-align: center; font-size:12px; color:gray;"
            },AJS.IMG({s:"margin-top: 40px",src:"http://s.plurk.com/6ad45e7e08754eba760d200a93f1d115.gif"}), AJS.BR(), 
            tips
          );

          AJS.ACN( blank_window.document.body, (blank_window.loading_icon));
          blank_window.user_div = AJS.DIV({});
          var render_user_info = function(userlist){
            PlurkAdder.fetchUsersIfNeeded(userlist, 
              function(){
                blank_window.document.body.removeChild(blank_window.loading_icon);
                blank_window.document.body.appendChild(blank_window.user_div);
                for(var i = 0, user_length = userlist.length; i < user_length; i ++){
                  var user = SiteState.getUserById(userlist[i]);
                  blank_window.user_div.appendChild(
                    AJS.DIV({
                      s: "margin:2px; background:#DDD; border-bottom:1px solid gray;font-size:12px;"
                    },
                      AJS.IMG({s:"border:3px solid white; margin:2px; float:left;", src:Users.getUserImgSrc(user,"medium")}),
                      AJS.DIV({s:"margin-left: 50px;"}, 
                        AJS.A({s:"color:brown; font-weight:bold; text-decoration:none;", href:"/"+user.nick_name, target:"_blank"},
                          user.display_name || user.nick_name
                        ), AJS.BR(),
                        Users.getGender(user), Users.getLocation(user), AJS.BR(),
                        "Karma: " + user.karma
                      ),
                      AJS.DIV({s:"display:block; clear:both;"})
                    )
                  );
                }
                blank_iframe.style.height = "1px";
                var yScroll;
                if (blank_window.innerHeight && blank_window.scrollMaxY) {
                  yScroll = blank_window.innerHeight + blank_window.scrollMaxY;
                } else if (blank_window.document.body.scrollHeight > blank_window.document.body.offsetHeight) { // all but Explorer Mac
                  yScroll = blank_window.document.body.scrollHeight;
                } else { // Explorer Mac...would also work in Explorer 6 Strict, Mozilla and Safari
                  yScroll = blank_window.document.body.offsetHeight;
                }
                if(yScroll>400) yScroll = 400;
                AJS.$("settingFrame").style.height = yScroll + "px"; 
                blank_iframe.style.height = yScroll + "px";
              }, "rfc"
            );
          };
          setTimeout(function(){
            render_user_info(userlist);
          }, 2000);
        };
        setTimeout( list_all, 1000);
      });
      return list_all_icon;
    };
    Responses._renderLimitedTo = function (e, a, c, d) {
      AJS.RCN(e, _("private plurk to"), " ");
      var b = false;
      if (d.length == 2 && d[0] == d[1]) {
        d = [d[0]]
      }
      AJS.map(d, function (n, h) {
        if (n == a.owner_id && d.length != 1) {
          return
        }
        var f = SiteState.getUserById(n);
        var m = SiteState.getSessionUser();
        if (parseInt(n) == m.uid) {
          f = m
        }
        if (f) {
          var l = AJS.A({
            href: f.nick_name,
            c: "name"
          }, f.display_name || f.nick_name);
          var j = AJS.SPAN(l, " ");
          if (b) {
            AJS.hideElement(j)
          }
          AJS.ACN(e, j)
        }
        if (h == 6 && c.length > 7) {
          var g;
          AJS.ACN(e, AJS.SPAN(Responses._moreUsers(c.length - d.length)));
          b = true
        }
      })
      
      //{{ Start of fbinplurk hack: 直接加上這段即可 e 為第一個參數 e, c 為前幾行 c.length 的 c
      var show_limit_icon = Plurks._renderListAllIcon(c, _("private plurk to"), _("正在取得看得到這則噗的使用者清單"));
      AJS.ACN(e, show_limit_icon);
      ////}}
    };
    Plurks.__renderReplurkStr = function (c, f) {
      var b = f.obj;
      var e = b.replurkers_count;
      var d = format(ngettext(_("one plurker replurked this"), _("%d plurkers replurked this"), e), e);
      AJS.setHTML(c, d);
      var show_replurker_icon = Plurks._renderListAllIcon(b.replurkers, _("Who Replurked this?"), _("正在抓取轉了此噗的 Plurker 資料 ..."));
      if (b.replurkers) {
        var a = function () {
            var g = Plurks._userListStr(b.replurkers_count, b.replurkers, b.replurked, _("%s replurked this"), _("%s and %s replurked this"), _("%s and %d others replurked this"));
            AJS.setHTML(c, g)
                c.appendChild(show_replurker_icon);
          };
        setTimeout(function () {
          PlurkAdder.fetchUsersIfNeeded(b.replurkers, a, "rrs")
        }, 10);
      }
      c.appendChild(show_replurker_icon);
    };
    Plurks._renderFavoriteCount = function (b) {
      if (!SiteState.getSessionUser()) {
        return;
      }
      var e = $dp.info_box;
      var d = AJS.$bytc("div", "favorite_count", e, true);
      var c = b.favorite_count;
      var fb_mode = b.fb_uid?true:false;
      if(!fb_mode){
        if ((b.favorers == undefined) || c == 0) {
          AJS.hideElement(d);
          return;
        }
        AJS.showElement(d);
        AJS.setHTML(d, format(ngettext(_("one plurker liked this"), _("%d plurkers liked this"), c), c));
        var show_favorer_icon = Plurks._renderListAllIcon(b.favorers, _("Who liked this plurk?"), _("正在抓取喜歡此 Plurk 的 Plurker 資料 ..."));
        if (b.favorers) {
          var a = function () { 
              var f = Plurks._userListStr(b.favorite_count, b.favorers, b.favorite, _("%s liked this"), _("%s and %s liked this"), _("%s and %d others liked this"));
              AJS.setHTML(d, f)
              d.appendChild(show_favorer_icon);
          };
          setTimeout(function () {
            PlurkAdder.fetchUsersIfNeeded(b.favorers, a, "rfc");
          }, 10);
        }
        d.appendChild(show_favorer_icon);
      } else {
        AJS.hideElement(d);
        var query = FB.Data.query('SELECT user_id FROM like WHERE object_id = "{0}"', b.plurk_id);
        var _renderFavoriteCount_callback = function (rows) {
          if(rows.length > 0){
            c = rows.length;
            AJS.showElement(d);
            AJS.setHTML(d, format(ngettext(_("一名Facebook使用者說讚!"), _("%d名Facebook使用者都說讚!"), c), c));
          }
        };
        query.wait(_renderFavoriteCount_callback, function(){_renderFavoriteCount_callback([]);});
      }
    };
    ////}} Whole ListAll (End)
    Plurks._renderIcons = function (f, d) {
      var a = f.obj;
      var h = f.div;
      var b = jQuery(h);
      if (!d) {
        d = SiteState.getPlurkUser(a)
      }
      if (!Plurks.$icon_pri) {
        Plurks.$icon_pri = jQuery("<div class='plurk_icon private'>").append("<img src='//s.plurk.com/c550f52f61da13964d5415c07b7506ca.png' height='16' width='16'>")
      }
      if (!Plurks.$icon_fav) {
        Plurks.$icon_fav = jQuery("<div class='plurk_icon favorite_icon'>").append("<img src='//s.plurk.com/ffdca9715cfcd8ea7adc140c1f9d37df.png' height='16' width='16'>")
      }
      if (!Plurks.$icon_replurk) {
        Plurks.$icon_replurk = jQuery("<div class='plurk_icon private'>").append("<img src='//s.plurk.com/2da9c174ff4bce649887dba83a97222e.png' height='16' width='16'>")
      }
      if (!Plurks.$icon_birth) {
        Plurks.$icon_birth = jQuery("<div class='plurk_icon bday'>").append("<img src='//s.plurk.com/095108068bb9c366ab82a362d84610aa.png' height='16' width='16'>")
      }
      //{{ startof fb_mode: 這段直接加上去即可
      if (!Plurks.$fip_icon) {
        Plurks.$fip_icon = jQuery("<div class='plurk_icon private'>").append("<img src='http://www.grassboy.tw/fbTools/fb_icon.png' height='16' width='16'>")
      }
      //}} endof fb_mode hack
      b.find("div.plurk_icon").remove();
      var g = 15;
      if (a.limited_to) {
        Plurks.$icon_pri.clone().css("left", g).appendTo(b);
        g += 17
      }
      if (a.favorite) {
        Plurks.$icon_fav.clone().css("left", g).appendTo(b);
        g += 17
      }
      //{{ startof fb_mode hack:a為前一行if block的a.favorite b為前兩個if block的b g為前兩個if block的g 
      if (a.fb_uid && a.id.toString().indexOf("_")==-1) {
        Plurks.$fip_icon.clone().css("left", g).appendTo(b);
        g += 17
      }
      //}} endof fb_mode hack
      if (a.replurked) {
        Plurks.$icon_replurk.clone().css("left", g).appendTo(b)
      }
      var e = d.date_of_birth;
      if (e && typeof (e) == "object") {
        var c = new Date();
        if ((e.getUTCMonth() == c.getMonth()) && (e.getUTCDate() == c.getDate())) {
          Plurks.$icon_birth.clone().appendTo(b)
        }
      }
    };
    Plurks._favoritePlurk = function(){

      var d = $dp.hover_div;
      var c = getPD(d);
      var a = c.obj;
      var fb_mode = c.obj.fb_uid?true:false;

      //{ { fb_in_plurk_hack: 無腦加上這段即可XDD
      if(fb_mode){
        return
      }
      ////}}
      a.favorite = !a.favorite;
      var b = AJS.loadJSON("/Favorites/set");
      b.sendReq({
        plurk_id: a.plurk_id,
        favorite: a.favorite,
        token: SiteState.getToken()
      });
      if (a.favorite) {
        a.favorers.push(SiteState.getSessionUser().id);
        a.favorite_count = a.favorite_count + 1
      } else {
        a.favorers.splice(AJS.getIndex(SiteState.getSessionUser().id, a.favorers), 1);
        a.favorite_count = a.favorite_count - 1
      }
      Plurks._renderFav(c);
      Plurks._renderIcons(c, false);
      Plurks._renderIcons(c, false);
      Plurks._renderReplurkDetails(c);
      Plurks._renderFavoriteCount(a);
      TimeLineCache.purge("favorite");
      Plurks.noExapndOnAction();
      if (a.favorite) {
        Signals.sendSignal("plurk_favorited", a)
      } else {
        Signals.sendSignal("plurk_unfavorited", a)
      }
      return false
    };
    Plurks._plurkMouseOver = function (f) {
      var c = jQuery(f);
      var a = getPD(f);
      var d = $dp.edit_text_area;
      if (Plurks.plurkMouseOutTO) {
        clearTimeout(Plurks.plurkMouseOutTO)
      }
      if ($dp.hover_div == f) {
        return
      } else {
        var b = jQuery($dp.hover_div);
        b.removeClass("link_extend");
        if (SiteState.canEdit()) {
          TinyEmoAdder.remove();
          if (!b.hasClass("plurk_box")) {
            b.removeClass("display")
          }
        }
      }
      jQuery("div.display").each(function () {
        var g = jQuery(this);
        if (!g.hasClass("plurk_box")) {
          g.removeClass("display")
        }
      });
      $dp.hover_div = f;
      c.addClass("display").addClass("link_extend");
      if (tl_banana.enable && c.hasClass("banana_plurk")) {
        if ($dp.holder_shown) {
          Plurks.repositionCurrent()
        }
        TimeShow.displayTime(f);
        Plurks.fixBottomPlurk(f);
        return false
      }
      Plurks._renderManager(a.obj);
      //{{ start fb_mode hack: a 為上一行的 a.obj 的 a ，下面直接拉到 if block 即可
      if(!a.obj.fb_uid){
        var e = SiteState.getSessionUser();
        if (e) {
          if (!d) {
            jQuery($dp.manager).show()
          }
          Plurks._renderFav(a);
          Plurks._renderReplurk(a);
          Plurks._renderMute(a);
          jQuery(getPD(f).td_cnt).append($dp.manager)
        }
        if (SiteState.canEdit()) {
          if (!jQuery($dp.current_div).hasClass("plurk_box") && (d && d.value == "")) {
            $dp.current_div = f;
            $dp.hoverFlag = 1;
            jQuery($dp.manager).show().appendTo(getPD(f).td_cnt);
            $dp.save_link.innerHTML = _("save")
          }
        }
        if ($dp.holder_shown) {
          Plurks.repositionCurrent()
        }
      } else {
        //no-op under fbInPlurk mode
      }
      //}}
      TimeShow.displayTime(f);
      Plurks.fixBottomPlurk(f);
      return false
    };
    Plurks.expand= function (l) {
      var A = Plurks;
      var m = $dp.holder;
      if ($dp.removing) {
        return true
      }
      if ($dp.current_div == l && !$dp.hoverFlag) {
        A._removeExpand(false);
        return true
      }
      $dp.hoverFlag = null;
      TinyEmoAdder.remove();
      Plurks.noExapndOnAction(100);
      if (InfoOverlay.cloned) {
        InfoOverlay.hideInfoOverlay()
      }
      var t = AJS.getWindowSize().w;
      var f = AJS.absolutePosition(l).x;
      var x = (t - f);
      if (x < 460) {
        $dp.div2 = l;
        try {
          A._removeExpand(false);
          $dp.removing = true
        } catch (u) {}
        var w = (730 - x) / 4;
        TimeLine.slideBack(4, -w, "left", function () {
          if (!$dp.div2) {
            return
          }
          Plurks.expand($dp.div2);
          $dp.div2 = null
        });
        return true
      }
      AJS.removeClass(l, "link_extend");
      var j = getPD(l);
      var g = j.obj;
      //{{ fb_in_plurk_hack用到變數 g 為上一行的 g = j.obj
      var fb_mode = (g.fb_uid ? true : false);
      if (TimeLine.fb_new_msg[g.fb_post_id]){
        FB.api(
          {
            method: 'notifications.markRead',
            notification_ids: TimeLine.fb_new_msg[g.fb_post_id]
          },
          function(response) {
            if(fipHasError(response)) return;
            delete TimeLine.fb_new_msg[g.fb_post_id];
          }
        );
      }
      var fip_sync_icon = AJS.$("fip_sync_icon");
      if(fip_sync_icon){
        if(!fb_mode && g.fip_sync_id){
          fip_sync_icon.style.display = "inline-block";
        } else {
          fip_sync_icon.style.display = "none";
        }
      }
      ////}}
      if (A.poster) {
        var h = A.poster;
        if (A.visit_timeline) {
          var b;
          var C = SiteState.getPlurkUser(g);
          var B = C.display_name && C.display_name.length > 0 ? C.display_name : C.nick_name;
          var q = format(_("Visit %s's timeline to respond"), B);
          var n = AJS.A({
            href: "/" + C.nick_name
          }, q);
          AJS.swapDOM(h.table, b = AJS.DIV({
            s: "text-align: center;"
          }, n));
          h.table = b
        } else {
          h.input.disabled = false;
          h.input.value = "";
          h.menu.updateSessionQual()
        }
        var o = SiteState.getSessionUser();
        var d = o && o.id == g.owner_id;
        if (g.no_comments == 1) {
          AJS.hideElement($dp.post_holder);
          AJS.hideElement($dp.commets_only_friends);
          AJS.showElement($dp.commets_disabled)
        } else {
          if (g.no_comments == 2) {
            AJS.hideElement($dp.post_holder);
            AJS.hideElement($dp.commets_disabled);
            if (FRIEND_IDS.indexOf(g.owner_id)) {
              AJS.showElement($dp.post_holder)
            }
            AJS.showElement($dp.commets_only_friends)
          } else {
            AJS.hideElement($dp.commets_only_friends);
            AJS.hideElement($dp.commets_disabled);
            AJS.showElement($dp.post_holder)
          }
        }
        if (d) {
          AJS.showElement($dp.post_holder)
        }
      }
      A.removeCurrentOpen();
      PlurkBlock.toggleHighlight(l, 1);
      $dp.current_div = l;
      AJS.addClass(l, "plurk_box");
      var y = SiteState.getSessionUser();
      //{{ fb_in_plurk_hack 只要把兩段if else放進block就行
      if(!fb_mode){
        if (A.show_expand && y && g.owner_id == y.uid) {
          AJS.showElement($dp.manager);
          AJS.ACN(getPD(l).td_cnt, $dp.manager);
          $dp.save_link.innerHTML = _("save")
        } else {
          if (SiteState.canEdit()) {
            if (g.is_unread == 2) {
              AJS.addClass(AJS.setHTML($dp.mute_link, _("unmute")), "unmute")
            } else {
              AJS.removeClass(AJS.setHTML($dp.mute_link, _("mute")), "unmute")
            }
          }
        }
        if (g.is_unread == 2) {
          AJS.addClass(m, "muted")
        } else {
          AJS.removeClass(m, "muted")
        }
      } else {

      }
      //}}
      var s = jQuery(m);
      var v = {
        pid36: g.plurk_id.toString(36),
        pid: g.plurk_id
      };
      var r = jQuery(Plurks.infoBoxTmpl(v));
      s.find(".info_box.controller").remove();
      s.find("#resp_banner_ads").remove();
      s.append(r);
      $dp.info_box = r.get(0);
      //{{ fb_in_plurk_hack: g: 第一段hack的 g; 這段 hack 的 else block 直接把原始的 code block 包住即可
      if(fb_mode){
        r.find('.report_link a').remove();
        r.find('.perma_link a').attr("href", ["http://www.facebook.com/permalink.php?story_fbid=", g.plurk_id,"&id=", g.fb_uid].join(''));
        if(g.fb_place_id){
          var a = r.find(".plurk_loc");
          if (!window.GB_showCenter) {
            return
          }
          a.find("a").text('@'+g.fb_place.name).click(function () {
            GB_showCenter(['<a target="_blank" href="http://www.facebook.com/',g.fb_place_id,'" title="觀看 Facebook 專頁..."><img src="http://www.grassboy.tw/fbTools/fb_icon.png"></a> ', g.fb_place.name].join(''), 
              ["https://maps.google.com.tw/maps?q=",g.fb_place.lat,"+",g.fb_place.lon,"+(",encodeURIComponent(g.fb_place.name),")&hl=zh-TW&t=m&ie=UTF8&z=15&iwloc=A&ll=",g.fb_place.lat,"+",g.fb_place.lon,"&output=embed"].join(''),
            600, 800)
            return false
          });
          a.show();
        }
      } else {
        r.find(".report_link a").click(function () {
          if (!window.GB_showCenter) {
            return
          }
          GB_showCenter(_("Report the following plurk as abuse"), this.href + "?overlay=1", 650, 400);
          return false
        });
        if (g.latitude && g.longitude) {
          var a = r.find(".plurk_loc");
          if (!window.GB_showCenter) {
            return
          }
          a.find("a").click(function () {
            GB_showCenter(_("Plurk location"), this.href, 650, 400);
            return false
          });
          a.show()
        }
        if (y) {
          Plurks._renderReplurkDetails(j);
          Plurks._renderFavoriteCount(g)
        }
      }
      //}}
      var c = r.find(".limited_box");
      if (g.limited_to) {
        c.show();
        var p = g.limited_to;
        if (p == Plurk.friends_only) {
          c.text(_("private plurk to friends"))
        } else {
          if (p.replace) {
            p = p.replace(/\|\|/g, "|").replace(/^\|/, "").replace(/\|$/, "").split(/\|/)
          }
          var z = p;
          if (p.length > 8) {
            z = p.slice(0, 8)
          }
          PlurkAdder.fetchUsersIfNeeded(z, AJS.$p(Responses._renderLimitedTo, c.get(0), g, p, z), "lts")
        }
      }
      setTimeout(function () {
        var D = jQuery(l).find(".plurk_cnt");
        var F = D.offset();
        var e = /metro_c\d+/.exec(D[0].className);
        var E = jQuery(m);
        E.css({
          top: F.top + D.outerHeight(),
          left: F.left,
          width: D.outerWidth()
        }).find("div.list").attr("style", "").end().show();
        if (e) {
          E.attr("class", "plurk_box " + e[0])
        } else {
          E.attr("class", "plurk_box")
        }
        $dp.holder_shown = true;
        if (A.show_expand) {
          Responses.showLoading($dp.list);
          //{{ fb_in_plurk_hack : else區段只要放一行 , if區段內的g為第一段hack的g、m為else區段的m
          if (fb_mode) {
            var query = FB.Data.query('SELECT object_id, post_id, fromid, time, text, id FROM comment WHERE post_id = "{0}_{1}"', g.fb_uid, g.plurk_id);
            var expand_callback = function (rows) {
              var i = 0;
              for (i = 0; i < rows.length; i++) {
                rows[i] = fbResp2plurkItem(rows[i]);
              }
              Responses._renderList(m, rows);
            };
            query.wait(expand_callback, function(){expand_callback([]);});  
          } else {
            Responses.fetchItems(m)
          }
          ////}}
        }
      }, 0)
    };
    Plurks.renderPlurk= function (j, m) {
      //{{ fb_in_plurk_hack: j 為第一個參數 j
      var fb_mode = (j.fb_uid ? true : false);
      ////}}
      var z = Plurks;
      var m = m || false;
      var c = SiteState.getPlurkUser(j);
      if (!c) {
        return null
      }
      //{{ //startof fb_mode hack: c為前面var c = SiteState.getPlurkUser(j);中的c
      var tmp_dob = c.date_of_birth;
      var tmp_nc = c.name_color;
      if(fb_mode){
        c.name_color = "3459B2";
        c.date_of_birth = null;
      }
      ////}} end of fb_mode hack
      if (!Plurks.divTmpl) {
        Plurks.divTmpl = Handlebars.compile(Plurks.divTmplStr)
      }
      var g = Plurks.divTmpl;
      var u = (!m) ? "p" + j.id : "m" + j.id;
      if (m) {
        if (jQuery("#" + u).length) {
          return null
        }
      }
      var s = j.content.replace("<script", "");
      s = image_url_proto_relative(s);
      var a = null;
      var o = c;
      if (j.replurker_id) {
        a = SiteState.getUserById(j.replurker_id)
      }
      if (m && c.id == 99999) {
        var w = j.handle;
        var t = j.my_anonymous
      } else {
        var w = null;
        var t = false
      }
      var x = Qualifiers.format(c, j.qualifier, s, false, j.lang, j.id, (a != null), w, t);
      var v = x[0];
      //{{startof fb_mode hack: x為前一行的x[] j為前兩行j.lang的j; 
      var fillUAName = function (id) {
        return function (rows) {
          if (rows.length > 0) {
            AJS.$("uA_" + id).innerHTML = rows[0].name;
          }
        }
      };
      var fillUImgSrc = function (id) {
        return function (rows) {
          if (rows.length > 0) {
            AJS.$("uImg_" + id).src = rows[0].pic_square;
          }
        }
      };
      if (fb_mode) {
        var obj_a = x[0].getElementsByTagName("a")[0]; 
        obj_a.id = "uA_" + j.id;
        obj_a.href = "http://www.facebook.com/profile.php?id=" + j.fb_uid;
        obj_a.innerHTML = FB.getUser(j.fb_uid, fillUAName(j.id)).name;
        obj_a.target = "_blank";
      }
      //}} endof fb_mode hack
      var p = x[1];
      if (a) {
        o = a;
        var r = SiteState.getSessionUser();
        var A = a.display_name || a.nick_name;
        var B = (r && r.default_lang) || "en";
        var f = Qualifiers._(a.gender, B, "replurks");
        var d = "<span><a class='name' href='/" + a.nick_name + "' data-uid='" + a.id + "'>" + A + "</a><span class='qualifier q_replurks'>" + f + "</span></span>";
        p = jQuery("<div class='text_holder'>").append(v).append(p).get(0);
        v = jQuery("<span>").append(d).get(0)
      }
      var b;
      //{{ //startof fb_mode hack: m為此function的第二個參數m, b為前一行的var b, j為前面用到 j.lang 中的 j,  o為前面 if block 內的 o = a; 中的 o
      if (!m) {
        b = (fb_mode? FB.getUser(j.fb_uid, fillUImgSrc(j.id)).pic_square : Users.getUserImgSrc(o));
      }
      ////}}
      var y = "";
      if (c.nick_name == "plurkbuddy" && SiteState.canEdit()) {
        y += "glow"
      }
      if (j.is_unread == 2) {
        y += " muted"
      }
      if (SiteState.canEdit() && (Poll.current_data.unread_plurks[j.id])) {
        y += " new"
      }
      if (m && !w && (getPD($dp.current_div).obj.owner_id == j.user_id)) {
        y += " highlight_owner"
      }
      if (tl_banana.enable && j.is_ad) {
        y += " banana_plurk display";
        if (jQuery.inArray(j.plurk_id.toString(), tl_banana.plurk[j.realId].impress) > -1) {
          y += " impress"
        }
        j.response_count = "韐箫阔"
      }
      var q = {
        plurk_id: j.plurk_id,
        rid: (j.id != j.plurk_id) ? j.id : "",
        user_id: j.user_id,
        owner_id: j.owner_id,
        span_qual: outerHTML(v),
        div_cnt: outerHTML(p),
        img_src: b,
        div_cls: y,
        response_count: j.response_count,
        mini: m,
        type: (m) ? "response" : "plurk"
      };
      var h = jQuery(g(q));
      if (m) {
        h.find(".td_img").empty()
      }
      if (tl_banana.enable && j.is_ad) {
        h.click(function (C) {
          tl_banana.clickAds(this);
          return false
        })
      }
      var n = h.get(0);
      n.id = u;
      var l = $plurks[u] = {
        obj: j,
        div: n,
        $div: h,
        image: h.find(".p_img").get(0),
        div_cnt: h.find(".text_holder").get(0),
        td_cnt: h.find(".td_cnt").get(0),
        cnt: h.find(".plurk_cnt").get(0),
        tr_cnt: h.find(".tr_cnt").removeAttr("class").get(0),
        tr_info: h.find(".tr_info").get(0),
        td_info: h.find(".td_info").get(0),
        tr: h.find("tr").get(0)
      };
      if (!m) {
        Plurks._renderIcons(l, o);
        var e = h.find(".td_response_count");
        getPD(n).td_resp_count = e.get(0);
        getPD(n).response_count = e.find(".response_count").get(0);
        if (j.response_count == 0) {
          e.find(".response_count").hide()
        }
      }
      if (!w || w == "鉦揸鉦 ") {
        Plurks.applyNameColor(n, j)
      }
      if (window.Media) {
        Media.attach(n)
      }
      if (window.annoplurk) {
        annoplurk.attach(n)
      }
      //{{ //startof fb_mode hack: c為一開始var c = SiteState.getPlurkUser(...);中的c 
      if(fb_mode){
        c.date_of_birth = tmp_dob;
        c.name_color = tmp_nc;
      }
      ////}} end of fb_mode hack
      return n
    };
    TimeLine.getFacebookNotifications = function(){
      var query = FB.Data.query('SELECT notification_id, title_html, title_text, app_id, href FROM notification WHERE recipient_id={0} AND is_unread = 1', FB.getAuthResponse().userID);
      var getFacebookNotifications_callback = function(rows){
        add_to_TimeLine = function(post_id, notification_id){
          if(!TimeLine.fb_new_msg[post_id]){
            TimeLine.fb_new_msg[post_id] = [];
          }
          TimeLine.fb_new_msg[post_id].push(notification_id);
        };
        TimeLine.fb_new_msg = {};
        TimeLine.fb_new_msg_async = {}; /*需經由username查詢才能產生的notification清單*/
        TimeLine.fb_uid_async_waiting = false; /*用來記錄是否還在等待查詢uid的非同步呼叫*/
        var query_uid_from_name_str = '';
        for(var i=0; i < rows.length; i++){
          if(rows[i].app_id == "19675640871"){ /*comment專用的appid？*/
            if(a = rows[i].href.match(/http:\/\/www\.facebook\.com\/permalink\.php\?story_fbid=([\d]+)&id=([\d]+)/)){
              a[0] = a[2] + "_" + a[1];
              add_to_TimeLine(a[0], rows[i].notification_id);
            } else if (a = rows[i].href.match(/http:\/\/www\.facebook\.com\/profile\.php\?id=([\d]+)&v=wall&story_fbid=([\d]+)/)) {
              a[0] = a[1] + "_" + a[2];
              add_to_TimeLine(a[0], rows[i].notification_id);
            } else if (a = rows[i].href.match(/http:\/\/www\.facebook\.com\/([^\/]+)\/posts\/([\d]+)/)) {
              query_uid_from_name_str += ',"' + a[1] + '"';
              if(!TimeLine.fb_new_msg_async[a[1]]){
                TimeLine.fb_new_msg_async[a[1]] = [];
              }
              TimeLine.fb_new_msg_async[a[1]].push({pid:a[2], nid:rows[i].notification_id});
            }
          }
        }
        if(query_uid_from_name_str!=""){
          var sub_query = FB.Data.query('SELECT uid, username FROM user WHERE username IN ("!null!"{0})', query_uid_from_name_str);
          var sub_query_callback = function(sub_rows){
            for(var i = 0; i < sub_rows.length; i++){
              var tmp_post_id_list = TimeLine.fb_new_msg_async[sub_rows[i].username];
              if(tmp_post_id_list){
                for(var j = 0; j < tmp_post_id_list.length; j++){
                  add_to_TimeLine(sub_rows[i].uid+"_"+tmp_post_id_list[j].pid, tmp_post_id_list[j].nid);
                }
              }
            }
            delete TimeLine.fb_new_msg_async;
          };
          sub_query.wait(
            sub_query_callback, 
            function(){sub_query_callback([]);}
          );
        }
        setTimeout(TimeLine.getFacebookNotifications, 300000);
      };
      query.wait(
        getFacebookNotifications_callback, function(){getFacebookNotifications_callback([]);}
      );
    };
    setTimeout(TimeLine.getFacebookNotifications, 3000);
    TimeLine.fb_new_msg = {};
    Poll.showUpdates = function (e) {
      if (PlurkSearch.current_pane == "search") {
        return
      }
      var b = Poll.current_data;
      var f = AJS.keys(b.new_plurks).length;
      var d = Poll.getUnreadPlurks().length;
      var c = f + d;
      var fb_msg = AJS.keys(TimeLine.fb_new_msg).length;
      var need_fb_sep = false;
      if (window.fluid) {
        if (c == 0) {
          window.fluid.dockBadge = "";
        } else {
          window.fluid.dockBadge = "" + c;
        }
      }
      AJS.showElement(AJS.$("updater"));
      AJS.setVisibility(AJS.$("updater"), true);
      if (d > 0 && f > 0 && Poll.mode != "new") {
        AJS.showElement(AJS.$("update_sepa"));
        need_fb_sep = true;
      } else {
        if (fb_msg == 0 && c == 0 && Poll.mode != "new") {
          AJS.hideElement(AJS.$("updater"));
        } else {
          AJS.hideElement(AJS.$("update_sepa"));
        }
      }
      if (d > 0 || Poll.mode == "new") {
        AJS.showElement(AJS.$("noti_re"));
        ngettext("%d new response", "%d new responses", d, true);
        var a = format(ngettext("%d new response", "%d new responses", d), d);
        AJS.setHTML(AJS.$("noti_re_text"), a);
        need_fb_sep = true;
      } else {
        AJS.hideElement(AJS.$("noti_re"));
      }
      if (f > 0 && Poll.mode != "new") {
        var a = format(ngettext("%d new plurk", "%d new plurks", f), f);
        AJS.setHTML(AJS.$("noti_np_text"), a);
        AJS.showElement(AJS.$("noti_np"));
        need_fb_sep = true;
      } else {
        AJS.hideElement(AJS.$("noti_np"));
      }
      if (fb_msg > 0) {
        if(!AJS.$("noti_fb_re"))
          add_noti_fb_re();
        if(need_fb_sep)
          AJS.showElement(AJS.$("update_fb_sepa"));
        AJS.showElement(AJS.$("noti_fb_re"));
        var a = format(ngettext("一則來自Facebook的回應", "%d則來自Facebook的回應", fb_msg), fb_msg);
        AJS.setHTML(AJS.$("noti_fb_re_text"), " ", a);
      } else {
        if(!FB.fipInReMode){
          AJS.hideElement(AJS.$("update_fb_sepa"));
          AJS.hideElement(AJS.$("noti_fb_re"));
        } else {
          AJS.setHTML(AJS.$("noti_fb_re_text"), " ", "所有Facebook的回應皆已閱讀");
        }
      }
      Poll.updateCounters();
    };
    AJS.$("form_holder").parentNode.removeChild(AJS.$("form_holder")); //要重載form_holder
    Plurks.init();
    (function(){
      var form_holder = AJS.$("form_holder");
      var icons_holder = form_holder.getElementsByClassName("icons_holder");
      if(icons_holder.length != 1) {
        alert("Fip Sync Icon 無法插入！");
        return;
      }
      icons_holder = icons_holder[0];
      var fip_sync_icon = AJS.DIV({
        id:"fip_sync_icon",
        c:"enable",
        s:"opacity: 1;margin-top:3px; display:none; width:16px; height:16px; vertical-align: middle; cursor:pointer; background: url(http://www.facebook.com/favicon.ico) no-repeat scroll 0 0 transparent"
      }, "");
      AJS.AEV(fip_sync_icon, "mouseover", function(event){
        if(AJS.hasClass(this, "enable")){
          AmiTooltip.show(this, AJS.DIV({c: 'tooltip_cnt'}, '您在這則噗的回應', AJS.BR(), '將同步至Facebook'), event);
        } else {
          AmiTooltip.show(this, AJS.DIV({c: 'tooltip_cnt'}, '您在這則噗的回應', AJS.BR(), '暫時不會同步至Facebook'), event);
        }
      });
      AJS.AEV(fip_sync_icon, "mouseout", function(){
        AmiTooltip.hide();
      });
      AJS.AEV(fip_sync_icon, "click", function(){
        AmiTooltip.hide();
        if(AJS.hasClass(this, "enable")){
          AJS.removeClass(this, "enable");
          AJS.addClass(this, "disable");
          this.style.opacity = 0.5;
        } else {
          AJS.removeClass(this, "disable");
          AJS.addClass(this, "enable");
          this.style.opacity = 1;
        }
      });
      AJS.ACN(icons_holder, fip_sync_icon);

      jQuery("#form_holder").on("mouseover mouseout", "div.plurk", function (c) {
        switch (c.type) {
        case "mouseover":
          if (jQuery(c.target).hasClass("emoticon_my")) {
            return true
          }
          Responses.responseMouseOver(this);
          return false;
        case "mouseout":
          if (jQuery(c.target).hasClass("emoticon_my")) {
            return true
          }
          Responses.responseMouseOut(this);
          return false
        }
        return true
      })
    })();
    getFBfipListLimit();
    function status2plurk(fbstatus) {
      var result = {
        "lang": GLOBAL.session_user.default_lang,
        "favorers": [],
        "content_raw": fbstatus.message,
        "user_id": SETTINGS.user_id,
        "qualifier": "says",
        "plurk_id": fbstatus.status_id,
        "response_count": 0,
        "favorite": false,
        "id": fbstatus.status_id,
        "content": fbstatus.message,
        "is_unread": 0,
        "responses_seen": 32767,
        "posted": new Date(fbstatus.time * 1000),
        "limited_to": null,
        "no_comments": 0,
        "favorite_count": 0,
        "owner_id": SETTINGS.user_id,
        "fb_uid": fbstatus.uid,
        "fb_post_id": fbstatus.status_id,
        "fb_place_id": fbstatus.place_id,
        "fb_place": null
      };
      if(fbstatus.place_id){
        FB.api("/"+fbstatus.place_id, "get", function(response){
          result.fb_place = {
            link: response.link,
            name: response.name,
            lat: response.location.latitude,
            lon: response.location.longitude
          };
        })
      }
      return result;
    }
    function stream2plurk(fbstream) {
      var result = {
        "lang": GLOBAL.session_user.default_lang,
        "favorers": [],
        "content_raw": fbstream.message,
        "user_id": SETTINGS.user_id,
        "qualifier": "says",
        "plurk_id": fbstream.post_id.split("_")[1],
        "response_count": 0,
        "favorite": false,
        "id": fbstream.post_id.split("_")[1],
        "content": fbstream.message,
        "is_unread": 0,
        "responses_seen": 32767,
        "posted": new Date(fbstream.created_time * 1000),
        "limited_to": null,
        "no_comments": 0,
        "favorite_count": 0,
        "owner_id": SETTINGS.user_id,
        "fb_uid": fbstream.post_id.split("_")[0],
        "fb_post_id": fbstream.post_id
      };
      return result;
    }

    function fbResp2plurkItem(fbResp) {
      var result = {
        "lang": GLOBAL.session_user.default_lang,
        "content_raw": fbResp.text,
        "user_id": SETTINGS.user_id,
        "qualifier": "says",
        "plurk_id": fbResp.post_id.split("_")[1],
        "content": fbResp.text,
        "id": fbResp.id,
        "posted": new Date(fbResp.time * 1000),
        "fb_uid": fbResp.fromid
      };
      return result;
    }
    function add_noti_fb_re(){
      var e = AJS.DIV({
        id: "noti_fb_re_view",
        c: "item"        
      }, l = AJS.A({
        href: "#"
      }, AJS.SPAN({
        id: "noti_fb_re_text",
        c: "text"
      }), " ", n = Poll._markFirst(_("觀看"))));
      AJS.onEvent(l, "click", function(){
        if(FB.fipInReMode){
          FB.fipInReMode = false;
          AJS.setHTML(n, _("觀看"));
          Poll._viewAll();
          return false;
        }
        window.scrollTo(0, 0);
        Plurks.removeCurrentOpen();
        TimeLine.showLoading();
        Poll.mode = "new";
        var query = FB.Data.query('SELECT post_id,message,created_time FROM stream WHERE post_id IN ("{0}")', AJS.keys(TimeLine.fb_new_msg).join('","'));
        var add_noti_fb_re_callback = function(rows){
          for(var m = 0; m < rows.length; m++){
            rows[m] = stream2plurk(rows[m]);
          }
          var b = rows; 
          var a = {};
          AJS.map(b, function (d) {
            a[d.owner_id] = true
          });
          Poll._backup_mode = TimeLine.mode;
          Poll._backup_selected_tab = AJS.$bytc("a", "filter_selected")[0];
          Poll._backup_plurks = TimeLine.plurks;
          Poll._backup_tracks = Tracks.plurks;
          var c = AJS.getFirst(TimeLine.active_blocks);
          Poll._backup_blocks = [TimeLine.blocks, TimeLine.active_blocks, c && getBD(c).div_bg.offsetLeft || 0];
          TimeLine.reset(true);
          TimeLine.plurks = [];
          PlurkAdder.fetchUsersIfNeeded(AJS.keys(a), function () {
            var d = [];
            TimeLine.insertPlurks(b);
          }, "rp");
          AJS.hideElement(AJS.$("noti_re_view"));
          AJS.hideElement(AJS.$("noti_re_actions"));
          AJS.hideElement(AJS.$("update_fb_sepa"));
          AJS.setHTML(n, _("切換至所有訊息"));
          FB.fipInReMode = true;
        };
        query.wait(add_noti_fb_re_callback, function(){add_noti_fb_re_callback([])});
        return false;
      });
      var g = AJS.DIV({
        id: "noti_fb_re",
        c: "item"
      }, e);
      var g2 = AJS.DIV({
        c: "item cmp_poll_line",
        id: "update_fb_sepa",
        style: "padding:0 5px;"
      });
      AJS.showElement(AJS.$("updater"));
      AJS.ACN(AJS.$("updater"), g2, g);

    };
  }
////}}
} else if (location.href.indexOf("http://www.plurk.com/Friends/")==0){
  function tips_why_del(){
    AJS.showElement(AJS.$("how_tips"));
  }
  function load_fip_setting(){
    setting =fipListLimit;
    for(var i=0; i<setting.length; i++){
      if(AJS.$("list_check_"+setting[i])){
        AJS.$("list_check_"+setting[i]).checked = true;
        AJS.$("fip_follow_type_lists").checked = true;
      }
    }
    if(!AJS.$("fip_follow_type_lists").checked)
      AJS.$("fip_follow_type_all").checked = true;
  }
  function save_fip_setting(){
    var new_flist = [];
    var check_item = AJS.$("fb_flist").getElementsByTagName("input");
    for(var i=0; i<check_item.length; i++){
      if(check_item[i].checked)
        new_flist.push(check_item[i].id.replace("list_check_",""));
    }
    if(new_flist.length!=0 && AJS.$("fip_follow_type_all").checked){
      alert("若您要在Plurk追蹤所有Facebook好友的訊息，請取消勾選已勾選的朋友清單");
      return;
    }
    if(new_flist.length==0 && AJS.$("fip_follow_type_lists").checked){
      alert("若您要在Plurk追蹤特定清單下的Facebook好友訊息，請勾選所需的朋友清單");
      return;
    }
    if(confirm("為了完成設定，Facebook in Plurk將會張貼一則狀態至您Facebook的塗鴉牆，您要繼續嗎？")){
      FB.api('/' + FB.getAuthResponse().userID + '/feed', 'post', {
        message: '我改了一下 http://tinyurl.com/287524m (Facebook in Plurk) 的設定，請無視下面的火星文...\r\n<fbinPlurkSetting flist="'+new_flist+'" />'
      }, function (response) {
        if (!response || response.error) {
          alert('Error occured');
        } else {
          alert("設定已儲存，新的設定將在下次進入Plurk時啟用！\n建議您可以將先前在塗鴉牆所新增的資訊給刪除:)");
          var query = FB.Data.query("SELECT status_id FROM status WHERE uid = {0} AND source = 142534085764122", FB.getAuthResponse().userID);
          var save_fip_setting_callback = function(rows){
            for(var i=1; i < rows.length; i++){
              FB.api('/' + rows[i].status_id, 'delete', {}, function (response) {});
            }
          };
          query.wait(
            save_fip_setting_callback,
            function(){
              save_fip_setting_callback([]);
            }
          );

        }
      });
    } else {
      tips_why_del();
      alert("設定未儲存，若您要完成設定，請允許Facebook in Plurk張貼狀態(詳見原理說明)，謝謝！");
    }
  }
  function toggleFIPTab(el) {
      if (prev_tab) {
    prev_tab.className = "";
      }
      location.hash = "";
      prev_tab = el.parentNode;
      prev_tab.className = "current";
      getFBfipListLimit();
    if (!FB.getUser && !FB.userInfo && FB.getAuthResponse()) {
      AJS.$("list").innerHTML = "<h2>您可以在此設定在您的噗浪河道上，限定追蹤特定清單下的Facebook好友狀態：</h2>" +
      '<div id="fip_content" style="height:auto; padding:2px; margin:3px; border:1px solid #aaa;"><div style="text-align:center; color:gray;"><img src="http://www.plurk.com/static/indicator.gif"><br>正在讀取您Facebook的好友清單中，請稍候…</div></div>';
      var query = FB.Data.query('SELECT flid,name FROM friendlist WHERE owner={0}', FB.getAuthResponse().userID);
      var toggleFIPTab_callback = function(rows){
        if(rows.length == 0){
          AJS.$("fip_content").innerHTML = "<h3>目前您的Facebook帳號下並無任何好友清單資訊，<br />所以Facebook in Plurk會自動追蹤所有Facebook好友的狀態...</h3>";
        } else {
          AJS.$("fip_content").innerHTML = "<h3>您目前河道上所追蹤的Facebook好友狀態如下，您可在這一頁進行修改：</h3><br />"+
          '<input type="radio" name="fip_follow_type" id="fip_follow_type_all"><label for="fip_follow_type_all">在噗浪河道上追蹤我所有Facebook好友的狀態</label><br />' +
          '<input type="radio" name="fip_follow_type" id="fip_follow_type_lists"><label for="fip_follow_type_lists">只在噗浪河道上追蹤我下列Facebook好友清單中的好友狀態</label><div id="fb_flist" style="margin: 5px 20px;"></div>';
          for(var i=0; i < rows.length; i++){
            AJS.ACN(AJS.$("fb_flist"), 
              AJS.LABEL({"for":"list_check_"+rows[i].flid}, 
                AJS.LI({style:"display:inline-block; width: 100px;"}, 
                  AJS.INPUT({type:"checkbox", id:"list_check_"+rows[i].flid}) ,
                  rows[i].name
                )
              )
            );
          }
          AJS.ACN(AJS.$("fip_content"), 
            AJS.DIV({id:"how_tips", style:"display:none;margin-top:20px; padding:2px;"}, 
              AJS.H3({},"此設定運作原理說明..."),
              "若您設定了Facebook in Plurk追蹤的好友清單，", AJS.BR(),
              "Facebook in Plurk會在您Facebook狀態列上發出一個如下圖的狀態",
              AJS.DIV({style:"text-align:center; margin:2px; padding:2px;"},
                AJS.IMG({style:"vertical-align:middle",src:"http://www.grassboy.tw/fbTools/tips.jpg"})
              ),
              "而這個狀態將會幫助我們去讀取您對Facebook in Plurk的設定", AJS.BR(),
              "雖然其他人也會看到您對Facebook in Plurk的設定，",AJS.BR(),
              "但他們只能看到您的好友清單的編號，",AJS.BR(),
              "無法從這編號看到清單名稱、此清單下的朋友列表，", AJS.BR(),
              "若您不是第一次透過這裡進行設定，Facebook in Plurk可能會多次在您的塗鴉牆發出狀態，", AJS.BR(),
              "多個設定資訊不會影響到Facebook in Plurk的運作，但您可能會覺得有礙觀瞻，", AJS.BR(),
              "所以您可以勾選「刪除先前的設定資訊」選項。永遠只留下最新的設定資訊..."
            ),
            AJS.DIV({style:"text-align:right; vertical-align:middle;"},
              AJS.A({href:"#", onclick:"javascript:tips_why_del()"},
                AJS.IMG({style:"vertical-align:middle",src:"http://www.grassboy.tw/fbTools/help.png"}),
                "運作原理說明"
              ),
              AJS.BUTTON({onclick:"javascript:save_fip_setting()", id:"add_new_clique", style:"margin:0px; 10px; background-color: green; color: white;"}, "儲存設定")
            )
          );
          load_fip_setting();
        }
      };
      query.wait(
        toggleFIPTab_callback,
        function(){toggleFIPTab_callback([]);}
      );

    } else {
      AJS.$("list").innerHTML = "您無法進行Facebook in Plurk的設定，很可能您已經登出！";
    }

      return false;
  }
  var obj = document.getElementById("subtabs");
  if(obj){
    new_li = document.createElement("li");
    new_li.id = "liFBinPlurk";
    new_li.innerHTML = "<a onclick=\"toggleFIPTab(this)\" href=\"#\">Facebook in Plurk設定</a>";
    obj.getElementsByTagName("ul")[0].insertBefore(new_li, obj.getElementsByTagName("ul")[0].firstChild);
    window.fbAsyncInit = function () {
      FB.init({
        appId: '142534085764122',
        status: true,
        cookie: true,
        xfbml: true
      });
    };
    var new_div = document.createElement("div");
    new_div.id = "fb-root";
    document.body.appendChild(new_div);
    var e = document.createElement('script');
    e.async = true;
    e.src = document.location.protocol + '//connect.facebook.net/zh_TW/all.js';
    document.getElementById('fb-root').appendChild(e);    
  } else {
    alert("none");
  }
} else {
}
// if(fipHasError(response)) return;
function fipHasError(response){
  if(response.error){
    FB.errorOccurred = true;
    AJS.$("fipStatus").innerHTML = '<img src="http://grassboy.tw/fbTools/facebookError.gif" style="cursor:pointer" onclick="alert(\'與Facebook的連線似乎出了一點問題，因此Facebook in Plurk暫停運作…\')" />';
    return true;
  } else {
    return false;
  }
};
function saveFIPsetting(){
  FB.api('/' + FB.getAuthResponse().userID + '/feed', 'post', {
    message: '我改了一下 http://tinyurl.com/287524m (Facebook in Plurk) 的設定，請無視下面的火星文...\r\n<fbinPlurkSetting flist="476356093857,133515303857" />'
  }, function (response) {
    if (!response || response.error) {
      alert('Error occured');
    } else {
      listMember(response);
    }
  });
        
}
function getFBfipListLimit(){
  FB.fipListLimit = [];
  FB.fipAllUid = [];
  
  var multiQuery = {
    "query1":("SELECT message FROM status WHERE uid = " + FB.getAuthResponse().userID + " AND source = 142534085764122 LIMIT 1"),
    "query2":("SELECT flid FROM friendlist WHERE owner = " + FB.getAuthResponse().userID)
  };
  for(key in multiQuery){
    
  }
  FB.api(
    {
    method: 'fql.multiquery',
    queries:{"query1":("SELECT message FROM status WHERE uid = " + FB.getAuthResponse().userID + " AND source = 142534085764122 LIMIT 1"),
       "query2":("SELECT flid FROM friendlist WHERE owner = " + FB.getAuthResponse().userID)}
    },
    function(response) {
    if(fipHasError(response)) return;
    if(response===null){
      response = [
        {fql_result_set:[]},
        {fql_result_set:[]}
      ]
    }
      var current_timestamp = parseInt(new Date().getTime()/1000);
    function in_array(value, inArray){
      var i;
      for(i = 0; i<inArray.length; i++){
        if(inArray[i] === value){
          return i;
        }
      }
      return -1;
    };
    var setting = response[0].fql_result_set;
    var all_list = response[1].fql_result_set;
    var i;
    var tmp=[];
    var showProfile = function(){
      try {TopBar;} catch (e) {TopBar = null;}
      //if(TopBar) TopBar.showProfile();   
    };
    for(i=0; i < all_list.length; i++){
      tmp.push(all_list[i].flid);
    }
    all_list = tmp;
    if(setting[0] && all_list[0]){
      setting = setting[0].message.match(/flist=\"([^\"]+)\"/);
      if(setting!=null){
        setting = setting[1].split(",");
        for(i = 0; i < setting.length; i++){
          if(in_array(setting[i], all_list) != -1){
            FB.fipListLimit.push(setting[i]);
          }
        }
      }
    }
    if(FB.fipListLimit.length!=0){
      var query = FB.Data.query('SELECT uid FROM status WHERE time > {0} AND uid IN(SELECT uid FROM friendlist_member WHERE flid IN ({1}))', current_timestamp - 86400*4 , FB.fipListLimit);
      var getFBfipListLimit_callback = function (rows) {
        var tmp_search = {};
        for(var i=0; i<rows.length; i++){
          if(tmp_search["q"+rows[i].uid]==true) continue;
          FB.fipAllUid.push(rows[i].uid);
          tmp_search["q"+rows[i].uid]=true;
        }
        if(tmp_search["q"+FB.getAuthResponse().userID]!=true){
          FB.fipAllUid.push(FB.getAuthResponse().userID);
        }
        delete tmp_search;
        showProfile();
      };
      query.wait(getFBfipListLimit_callback, function(){getFBfipListLimit_callback([]);});      
    } else {
      var query = FB.Data.query('SELECT uid FROM status WHERE time > {0} AND uid IN(SELECT uid2 FROM friend WHERE uid1={1})', current_timestamp - 86400*4 , FB.getAuthResponse().userID);
      var getFBfipListLimit_callback2 = function (rows) {
        for(var i=0; i < rows.length; i++){
          FB.fipAllUid.push(rows[i].uid);
        }
        if(in_array(FB.getAuthResponse().userID, FB.fipAllUid) == -1){
          FB.fipAllUid.push(FB.getAuthResponse().userID);
        }
        showProfile();
      };
      query.wait(getFBfipListLimit_callback2, function(){getFBfipListLimit_callback2([]);});
    }
    }, function(){
    alert("error occured 2499");
    }
  );
}

