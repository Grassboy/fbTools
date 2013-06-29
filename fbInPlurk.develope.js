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
        return function (h) {
          var key = "u"+uid;
          var fetched = false;
          var hh;
          var tryFetchH = function(){ 
            if(--TimeLine.remainCount <= 0){
              var minBegin = null;
              var maxEnd = null;
              h = [];
              for(key in TimeLine.receiveBuffer){
                userPlurks = TimeLine.receiveBuffer[key];
                if(userPlurks.length == 0) continue;
                if(config.addToTop && (!minBegin || getTimeAndFixPlurk(AJS.getFirst(userPlurks)) > minBegin))
                  minBegin = getTimeAndFixPlurk(AJS.getFirst(userPlurks));
                else if(!config.addToTop && (!maxEnd || getTimeAndFixPlurk(AJS.getLast(userPlurks)) > maxEnd))
                  maxEnd = getTimeAndFixPlurk(AJS.getLast(userPlurks));
                h = h.concat(userPlurks);
              }
              delete TimeLine.receiveBuffer;
              h.sort(c._sortPlurks);
              for(var i = 0; i < h.length-1; i++){
                if(h[i].id == h[i+1].id){
                  h.splice(i--, 1);
                }
              }
              if(h.length != 0){
                if(config.addToTop){
                  for(var i = 0 ; i < h.length; i++){
                    if(getTimeAndFixPlurk(h[i]) <= minBegin){
                      h.splice(0, i);
                      break;
                    };
                  }
                } else {
                  for(var i = 0 ; i < h.length; i++){
                    if(getTimeAndFixPlurk(h[i]) < maxEnd){
                      h.splice(i, h.length);
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
          if (h.error || !TimeLine.receiveBuffer) {
            if(h.error == "NoReadPermissionError") {
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
            if(tryFetchH() && h.length != 0){
              if (c.plurks.length > 0) {
                c.removeLoadingBlock(h);
              }
              return c._plurksFetched(h);
            }
            return;
          }
          if (!(h.constructor == Array) && h.plurks) {
            h = h.plurks
          }
          if(!fetched){
            if(TimeLine.receiveBuffer[key] && TimeLine.receiveBuffer[key].length > 0) {
              hh = TimeLine.receiveBuffer[key] = TimeLine.receiveBuffer[key].concat(h); //把之前取得的buffer接上去
            } else {
              hh = TimeLine.receiveBuffer[key] = h;
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
                    c.removeLoadingBlock(h);
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
            c.removeLoadingBlock(h);
          }

          var j = function () {
            c._plurksFetched(h, e);
          };
          var g = [];
          AJS.map(h, function (l) {
            g.push(l.owner_id);
            //{{ start fbinplurk hack 這兩行好像在官方的code被移除了…
            //但我不知道為什麼要刪@@
            if(l.replurker_id) 
              g.push(l.replurker_id);
            ////}}
          });
          if(c.user_ids || c.private_only || c.responded_only || c.favorite_only || c.notAtBegin || !(window.FB && window.FB.fetchStatusAfterGetPlurks)){
            PlurkAdder.fetchUsersIfNeeded(g, j, "gp");
          } else {
            FB.fetchStatusAfterGetPlurks(h, g, j, c);
          }
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

    PlurkSearch.showPane = function (c, a, notReload) {
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
    };
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
        g.startChecks(h);
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
      document.body.insertBefore(AJS.UL({id:"filter_tab"}), AJS.$("dashboard_holder"));
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
    };
    var new_li = AJS.SPAN({id: "fipLoginButton", style:"vertical-align:middle;display: inline-block; width: 100px; height:22px; overflow: hidden;"});
    new_li.innerHTML = '<fb:login-button scope="manage_notifications,read_friendlists,user_photos,user_videos,publish_stream,read_stream,friends_status,user_status,photo_upload" autologoutlink="true"></fb:login-button>';
    var new_li2 = AJS.SPAN({id: "fipStatus"});
    new_li2.innerHTML = '<a href="http://www.plurk.com/p/75f5hn" target="_blank" style="font-size:12px;"><img  style="vertical-align:middle;margin:2px;" src="http://grassboy.tw/fbTools/about.png" onmouseout="return AmiTooltip.hide()" onmouseover="return AmiTooltip.show(this, AJS.DIV({c: \'tooltip_cnt\'}, AJS.IMG({style:\'border:none;\',src:\'http://grassboy.tw/fbTools/about-48.png\'}), AJS.B(\'關於Facebook in Plurk~~ (請按我見說明)\')), event)" /></a>';
    
    document.getElementById("toggle_tab").appendChild(new_li);
    document.getElementById("toggle_tab").appendChild(new_li2);
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
    //{{ 取得來自Facebook的訊息
    FB.fetchStatusAfterGetPlurks = function(h, g, j, c){
      var last_time;
      if(h.length > 0){
        last_time = parseInt(h[h.length - 1].posted.getTime() / 1000) * 1000;
      } else {
        last_time = 0;
      }

      if (c.offset == 0) {
        var query = FB.Data.query('SELECT uid,status_id,message,time,place_id FROM status WHERE uid IN ({0}) AND time > {1} ', FB.fipAllUid, (last_time / 1000));
      } else {
        var query = FB.Data.query('SELECT uid,status_id,message,time,place_id FROM status WHERE uid IN ({0}) AND time > {1} AND time <= {2}', FB.fipAllUid, (last_time / 1000), parseInt(c.offset.getTime() / 1000));
      }
      var fb_getP_timeout = 0;
      var fb_getP_timeout_remain = 30;
      fb_getP_timeout = setInterval( function(){
        if((--fb_getP_timeout_remain) <= 0 || FB.errorOccurred){
          PlurkAdder.fetchUsersIfNeeded(g, j, "gp");
          fb_getP_timeout = -1;
        }
      }, 1000); //三十秒後就只顯示Plurk原本的Timeline
      //*
      var fbGetPlurks_callback = function (rows) {
        if(fb_getP_timeout==-1)
          return;
        if (fb_getP_timeout){ 
          clearInterval(fb_getP_timeout); //把預設的timeline disable掉
        }

        var m = 0;
        var n = 0;
        var fb_multi_timeout = 1;
        //var fb_getP_timeout3 = setTimeout(function(){
          fb_multi_timeout = -1;
          for (m = 0; m < rows.length; m++) {
            rows[m] = status2plurk(rows[m]);
            while (n < h.length && rows[m].posted < h[n].posted) {
              n++;
            }
            if (!rows[m].content.match(/http:\/\/plurk\.com\/p\/[a-z0-9]{6}$/) && 
                !rows[m].content.match(/<fbinPlurkSetting /)) 
              h.splice(n++, 0, rows[m]);
          }
          PlurkAdder.fetchUsersIfNeeded(g, j, "gp");
        //}, 5000);
        /*
        FB.api( //嚐試將取得的fbstatus 再作multiquery
          {
          method: 'fql.multiquery',
          queries:((function(){
            var result = {};
            var fetched_user = {};
            var time_limit;
            if(c.offset==0){
              time_limit = " AND time > " + (last_time / 1000);
            } else {
              time_limit = " AND time > " + (last_time / 1000) + " AND time <= " + (c.offset.getTime() / 1000);
            }
            for(var i=0; i<rows.length; i++){
              if(fetched_user["u"+rows[i].uid]){
                continue;
              } else {
                fetched_user["u"+rows[i].uid] = true;
                result["query"+i] = "SELECT uid, status_id, message, time FROM status WHERE uid = " + rows[i].uid + time_limit;
              }
            }
            return result;
          })())
          },
          function(response){
          console.dir(response);
          if(fipHasError(response)) return;
            if(response===null) response = [];
          if(fb_multi_timeout==-1){
            return;
          }
          clearTimeout(fb_getP_timeout3);
          var sorted_response = [];
          var m = 0;
          var n = 0;
          for (m = 0; m < response.length; m++){
            if(response[m].fql_result_set[0]) //如果至少有一結果
              sorted_response = sorted_response.concat(response[m].fql_result_set);
          }
          delete response;

          sorted_response.sort(function(a,b){
            return b.time - a.time;
          });
          rows = sorted_response;
          for (m = 0; m < rows.length; m++) {
            rows[m] = status2plurk(rows[m]);
            while (n < h.length && rows[m].posted < h[n].posted) {
              n++;
            }
            if (!rows[m].content.match(/http:\/\/plurk\.com\/p\/[a-z0-9]{6}$/) && 
                !rows[m].content.match(/<fbinPlurkSetting /)) 
              h.splice(n++, 0, rows[m]);
          }
          delete sorted_response;
          PlurkAdder.fetchUsersIfNeeded(g, j, "gp");
          }, function(response){
            alert("error occured 1140");
          }
        );  */            


      }
      query.wait(fbGetPlurks_callback, function(){fbGetPlurks_callback([]);}); 
    }
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
      var a = AJS.$("sync_checked_form");
      if (a) {
        a.style.display = "block";
      } else {
        AJS.ACN(AJS.$("sync_checked_holder"), PlurkPoster._renderSyncCheckbox());

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
      PlurkPoster.syncShown = 1
    };

    PlurkAdder.plurkResponse = function (e, g, j) {
      var c = getPD($dp.current_div).obj;
      //{{ start hack of fip: c 為 上一行的 c
      var fb_mode = c.fb_uid ? true : false;
      var fip_sync_id = c.fip_sync_id || null;
      ////}}
      if (!SiteState.checkIfLoggedIn()) {
        alert(_("You seem to be logged out. We will redirect you to login page."));
        window.location = "/Users/showLogin"
      }
      var a = c.lang;
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
      AJS.setHTML(AJS.$("input_small_cu"), "<span style=\"color: black\">" + _("Plurking response...") + "</span>");
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
      return false;
    };
    Responses.responseMouseOver = function (b) {
      if (Responses.mouseTO) {
        clearTimeout(Responses.mouseTO);
        Responses._responseMouseOut()
      }
      var e = getPD(b).obj;
      var fb_mode = e.fb_uid ? true : false;
      var d = Plurk.getById(e.plurk_id);
      var f = e.posted;
      var g = "@ " + Cal.formatMonthDate(f) + " - " + Cal.formatTime(f.getHours(), f.getMinutes());
      var h, c = null;
      var a = SiteState.getSessionUser().id;
      var p = e.user_id == a;
      var j = d.owner_id == a;
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
      if ((fb_mode && e.fb_uid == FB.getAuthResponse().userID) || (!fb_mode && (p || j))) {
        h = AJS.A({
          c: "resp_icon del_icon",
          title: _("delete this response")
        }, _("delete"));
        AJS.AEV(h, "click", fb_mode ? AJS.$p(delFBcomment, e, b, h) : AJS.$p(Responses.deleteResponse, b, h));
      }
      if ((!fb_mode && !p) || (fb_mode && e.fb_uid != FB.getAuthResponse().userID)) {
        replyToHandler = function (eid) {
          return function () {
            var r;
            if (fb_mode) {
              r = "@" + FB.getUser(e.fb_uid).name + ": " + AJS.$("input_small").value + "~";
            } else {
              var q = AJS.$("m" + eid).getElementsByTagName("a")[0].getAttribute("href", 2).substring(1);
              r = "@" + q + ": " + AJS.$("input_small").value + "~";
            }
            AJS.$("input_small").value = "";
            InputUtil.insertAtCursor(AJS.$("input_small"), r);

          };
        };
        c = AJS.A({
          c: "reply_to",
          title: _("reply to this person")
        }, _("reply"));
        AJS.AEV(c, "click", replyToHandler(e.id));
      }
      var m = AJS.DIV({
        c: "response_time plurk_cnt"
      }, AJS.DIV({
        c: "holder"
      }, AJS.P(g), AJS.BR(), c, h));
      var o = AJS.absolutePosition(b);
      o.x += $dp.holder.offsetWidth - 6;
      var l = AJS.$gp(b, "div", "list");
      o.y -= l && l.scrollTop || 0;
      AJS.setStyle(m, {
        top: o.y,
        left: o.x
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
            },AJS.IMG({s:"margin-top: 40px",src:"http://statics.plurk.com/6ad45e7e08754eba760d200a93f1d115.gif"}), AJS.BR(), 
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
      AJS.map(d, function (o, h) {
        if (o == a.owner_id && d.length != 1) {
          return
        }
        var f = SiteState.getUserById(o);
        var m = SiteState.getSessionUser();
        if (parseInt(o) == m.uid) {
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
      var show_limit_icon = Plurks._renderListAllIcon(c, _("private plurk to"), _("正在取得看得到這則噗的使用者清單"));
      AJS.ACN(e, show_limit_icon);
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
    Plurks._renderIcons = function (g, e, f) {
      var e = !! e;
      var c = g.obj;
      var a = g.div;
      if (!f) {
        f = SiteState.getPlurkUser(c)
      }
      var m = AJS.$bytc("div", "plurk_icon", a);
      for (var d = 0; d < m.length; d++) {
        AJS.removeElement(m[d])
      }
      var j = 15;
      if (c.limited_to) {
        AJS.appendToTop(a, AJS.DIV({
          c: "plurk_icon private",
          s: "left:" + j + "px"
        }, PNGIMG({
          src: "http://statics.plurk.com/c550f52f61da13964d5415c07b7506ca.png",
          width: 16,
          height: 16
        })));
        j += 17
      }
      if (c.favorite) {
        AJS.appendToTop(a, AJS.DIV({
          c: "plurk_icon favorite_icon",
          s: "left:" + j + "px"
        }, PNGIMG({
          src: "http://statics.plurk.com/ffdca9715cfcd8ea7adc140c1f9d37df.png",
          width: 16,
          height: 16
        })));
        j += 17
      }
      //startof fb_mode hack:t為前一行if block的t.favorite w為前兩個if block的w r為前一個if block的 var r; x為前一個if block的appendToTop(x
      if (c.fb_uid && c.id.toString().indexOf("_")==-1) {
        AJS.appendToTop(a, AJS.DIV({
          c: "plurk_icon private",
          s: "left:" + j + "px"
        }, PNGIMG({
          src: "http://www.grassboy.tw/fbTools/fb_icon.png",
          width: 16,
          height: 16
        })));
        j += 17
      }
      //endof fb_mode hack
      if (c.replurked) {
        AJS.appendToTop(a, AJS.DIV({
          c: "plurk_icon replurk",
          s: "left:" + j + "px"
        }, PNGIMG({
          src: "http://statics.plurk.com/2da9c174ff4bce649887dba83a97222e.png",
          width: 16,
          height: 16
        })));
        j += 17
      }
      if (!e) {
        var m = f.date_of_birth;
        if (m) {
          if (AJS.isString(m)) {
            m = new Date(m)
          }
          var j = new Date(m.getTime() + m.getTimezoneOffset() * 60000);
          var b = new Date();
          var h = "plurk_icon bday";
          if (j.getMonth() == b.getMonth() && j.getDate() == b.getDate()) {
            AJS.appendToTop(a, AJS.DIV({
              c: h
            }, PNGIMG({
              src: "http://statics.plurk.com/095108068bb9c366ab82a362d84610aa.png",
              width: 16,
              height: 16
            })))
          }
        }
      }
    };
    Plurks._favoritePlurk = function(){

      var d = $dp.hover_div;
      var c = getPD(d);
      var a = c.obj;
      var fb_mode = c.obj.fb_uid?true:false;

      //{ { fb_in_plurk_hack: 只是單純把code移到else block
      if(fb_mode){
      } else {
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
      }
      ////}}
    };
    Plurks._plurkMouseOver = function (e) {
      var b = jQuery(e);
      var a = getPD(e);
      var c = $dp.edit_text_area;
      if (Plurks.plurkMouseOutTO) {
        clearTimeout(Plurks.plurkMouseOutTO)
      }
      if ($dp.hover_div == e) {
        return
      } else {
        AJS.removeClass($dp.hover_div, "link_extend");
        if (SiteState.canEdit()) {
          TinyEmoAdder.remove();
          if (!AJS.hasClass($dp.hover_div, "plurk_box")) {
            AJS.removeClass($dp.hover_div, "display")
          }
        }
      }
      AJS.map(AJS.$bytc("div", "display"), function (f) {
        if (!AJS.hasClass(f, "plurk_box")) {
          AJS.removeClass(f, "display")
        }
      });
      $dp.hover_div = e;
      b.addClass("display").addClass("link_extend");
      Plurks._renderManager(a.obj);
      if(!a.obj.fb_uid){
        var d = SiteState.getSessionUser();
        if (d) {
          if (!c) {
            AJS.showElement($dp.manager)
          }
          Plurks._renderFav(a);
          Plurks._renderReplurk(a);
          Plurks._renderMute(a);
          AJS.ACN(getPD(e).td_cnt, $dp.manager)
        }
        if (SiteState.canEdit()) {
          if (!AJS.hasClass($dp.current_div, "plurk_box") && (c && c.value == "")) {
            $dp.current_div = e;
            $dp.hoverFlag = 1;
            AJS.showElement($dp.manager);
            AJS.ACN(getPD(e).td_cnt, $dp.manager);
            $dp.save_link.innerHTML = _("save")
          }
        }
        if ($dp.holder_shown) {
          Plurks.repositionCurrent()
        }
      } else {
        //no-op under fbInPlurk mode
      }
      TimeShow.on_plurk = e;
      Plurks.fixBottomPlurk(e);
      return false
    };
    Plurks.expand = function (m) {
      var F = Plurks;
      var o = $dp.holder;
      var v = jQuery(o);
      if ($dp.removing) {
        return true
      }
      if ($dp.current_div == m && !$dp.hoverFlag) {
        F._removeExpand(false);
        return true
      }
      $dp.hoverFlag = null;
      TinyEmoAdder.remove();
      Plurks.noExapndOnAction(100);
      if (InfoOverlay.cloned) {
        InfoOverlay.hideInfoOverlay()
      }
      var y = AJS.getWindowSize().w;
      var g = AJS.absolutePosition(m).x;
      var C = (y - g);
      if (C < 460) {
        $dp.div2 = m;
        try {
          F._removeExpand(false);
          $dp.removing = true
        } catch (z) {}
        var B = (730 - C) / 4;
        TimeLine.slideBack(4, -B, "left", function () {
          if (!$dp.div2) {
            return
          }
          Plurks.expand($dp.div2);
          $dp.div2 = null
        });
        return true
      }
      AJS.removeClass(m, "link_extend");
      var l = getPD(m);
      var h = l.obj;
      //{{ fb_in_plurk_hack用到變數 h 為上一行的 h = l.obj
      var fb_mode = (h.fb_uid ? true : false);
      if (TimeLine.fb_new_msg[h.fb_post_id]){
        FB.api(
          {
            method: 'notifications.markRead',
            notification_ids: TimeLine.fb_new_msg[h.fb_post_id]
          },
          function(response) {
          if(fipHasError(response)) return;
          delete TimeLine.fb_new_msg[h.fb_post_id];
          }
        );
      }
      var fip_sync_icon = AJS.$("fip_sync_icon");
      if(fip_sync_icon){
        if(!fb_mode && h.fip_sync_id){
          fip_sync_icon.style.display = "inline-block";
        } else {
          fip_sync_icon.style.display = "none";
        }
      }
      ////}}
      if (F.poster) {
        var j = F.poster;
        if (F.visit_timeline) {
          var b;
          var H = SiteState.getPlurkUser(h);
          var G = H.display_name && H.display_name.length > 0 ? H.display_name : H.nick_name;
          var t = format(_("Visit %s's timeline to respond"), G);
          var p = AJS.A({
            href: "/" + H.nick_name
          }, t);
          AJS.swapDOM(j.table, b = AJS.DIV({
            s: "text-align: center;"
          }, p));
          j.table = b
        } else {
          j.input.disabled = false;
          j.input.value = "";
          j.menu.updateSessionQual();
          var w = AJS.$gc(o, "span", "m_qualifier");
          j.menu.changeMenuLang(w, h.lang)
        }
        var r = SiteState.getSessionUser();
        if (h.no_comments == 1 && r && r.id != h.owner_id) {
          AJS.hideElement($dp.post_holder);
          AJS.hideElement($dp.commets_only_friends);
          AJS.showElement($dp.commets_disabled)
        } else {
          if (h.no_comments == 2) {
            AJS.hideElement($dp.commets_disabled);
            AJS.showElement($dp.commets_only_friends);
            AJS.showElement($dp.post_holder)
          } else {
            if (h.no_comments == 1) {
              AJS.hideElement($dp.commets_only_friends);
              AJS.showElement($dp.post_holder);
              AJS.showElement($dp.commets_disabled)
            } else {
              AJS.hideElement($dp.commets_only_friends);
              AJS.hideElement($dp.commets_disabled);
              AJS.showElement($dp.post_holder)
            }
          }
        }
      }
      F.removeCurrentOpen();
      PlurkBlock.toggleHighlight(m, 1);
      $dp.current_div = m;
      AJS.addClass(m, "plurk_box");
      var D = SiteState.getSessionUser();
      //{{ fb_in_plurk_hack 只要把兩段if else放進block就行
      if(!fb_mode){
        if (F.show_expand && D && h.owner_id == D.uid) {
          AJS.showElement($dp.manager);
          AJS.ACN(getPD(m).td_cnt, $dp.manager);
          $dp.save_link.innerHTML = _("save")
        } else {
          if (SiteState.canEdit()) {
            if (h.is_unread == 2) {
              AJS.addClass(AJS.setHTML($dp.mute_link, _("unmute")), "unmute")
            } else {
              AJS.removeClass(AJS.setHTML($dp.mute_link, _("mute")), "unmute")
            }
          }
        }
        if (h.is_unread == 2) {
          AJS.addClass(o, "muted")
        } else {
          AJS.removeClass(o, "muted")
        }
      } else {
      
      }
      //}}
      var A = $dp.info_box;
      var q = AJS.$bytc("span", "pixel", A, true);
      if (q) {
        AJS.removeElement(q)
      }
      var f = "/p/" + (h.plurk_id).toString(36);
      var d = AJS.$bytc("div", "limited_box", A, true);
      var u = AJS.$bytc("div", "perma_link", A, true);
      var c = AJS.A({
        href: f
      }, _("link"));
      c.setAttribute("target", "_blank");
      //{{ fb_in_plurk_hack: u:前面的 u = AJS.$bytec("div", "perma_link"....) 中的 u; h: 第一段hack的 h; 這段 hack 的 else block 直接把原始的 code block 包住即可
      if(fb_mode){
        AJS.RCN(u, AJS.A({
          href: ["http://www.facebook.com/permalink.php?story_fbid=", h.plurk_id,"&id=", h.fb_uid].join(''),
          target: "_blank"
        }, _("link")));
        var x = AJS.$bytc("div", "plurk_loc", A, true);
        if(h.fb_place_id){
          AJS.showElement(x);
          var a = AJS.$bytc("a", "plurk_loc_btn", x, true);
          AJS.setHTML(a, _("Show location") + ": " + h.fb_place.name);
          AJS.AEV(a, "click", function (I) {
            top.GB_showCenter(['<a target="_blank" href="http://www.facebook.com/',h.fb_place_id,'" title="觀看 Facebook 專頁..."><img src="http://www.grassboy.tw/fbTools/fb_icon.png"></a> ', h.fb_place.name].join(''), 
            ["https://maps.google.com.tw/maps?q=",h.fb_place.lat,"+",h.fb_place.lon,"+(",encodeURIComponent(h.fb_place.name),")&hl=zh-TW&t=m&ie=UTF8&z=15&iwloc=A&ll=",h.fb_place.lat,"+",h.fb_place.lon,"&output=embed"].join(''),
            600, 800);
            AJS.stopPropagation(I);
            AJS.preventDefault(I)
          })
        } else {
          AJS.hideElement(x);
        }
      } else {
        AJS.RCN(u, c);
        var x = AJS.$bytc("div", "plurk_loc", A, true);
        if (h.latitude && h.longitude) {
          AJS.showElement(x);
          var a = AJS.$bytc("a", "plurk_loc_btn", x, true);
          AJS.AEV(a, "click", function (I) {
            top.GB_showCenter(_("Plurk location"), "/PlurksLocation/show?plurk_id=" + h.plurk_id, 400, 650);
            AJS.stopPropagation(I);
            AJS.preventDefault(I)
          })
        } else {
          AJS.hideElement(x)
        }
        Plurks._renderManager(h);
        if (D) {
          Plurks._renderReplurkDetails(l);
          Plurks._renderFavoriteCount(h);
          AJS.showElement($dp.manager);
          AJS.ACN(getPD(m).td_cnt, $dp.manager)
        }
      }
      //}}
      if (h.limited_to) {
        AJS.showElement(d);
        var s = h.limited_to;
        if (s == Plurk.friends_only) {
          AJS.RCN(d, _("private plurk to friends"))
        } else {
          if (s.replace) {
            s = s.replace(/\|\|/g, "|").replace(/^\|/, "").replace(/\|$/, "").split(/\|/)
          }
          var E = s;
          if (s.length > 8) {
            E = s.slice(0, 8)
          }
          PlurkAdder.fetchUsersIfNeeded(E, AJS.$p(Responses._renderLimitedTo, d, h, s, E), "lts")
        }
      } else {
        AJS.hideElement(d);
        if (!(h.favorite_count || h.replurkers_count)) {
          AJS.ACN(A, AJS.setHTML(AJS.SPAN({
            c: "pixel"
          }), "&nbsp;"))
        }
      }
      setTimeout(function () {
        var I = jQuery(m).find(".plurk_cnt");
        var J = I.offset();
        var e = /metro_c\d+/.exec(I[0].className);
        jQuery(o).css({
          top: J.top + I.outerHeight(),
          left: J.left,
          width: I.outerWidth()
        }).find("div.list").attr("style", "").end().show();
        if (e) {
          jQuery(o).attr("class", "plurk_box " + e[0])
        } else {
          jQuery(o).attr("class", "plurk_box")
        }
        $dp.holder_shown = true;
        if (F.show_expand) {
          Responses.showLoading($dp.list);
          //{{ fb_in_plurk_hack : else區段只要放一行 , if區段內的h為第一段hack的h、o為else區段的o
          if (fb_mode) {
            var query = FB.Data.query('SELECT object_id, post_id, fromid, time, text, id FROM comment WHERE post_id = "{0}_{1}"', h.fb_uid, h.plurk_id);
            var expand_callback = function (rows) {
              var i = 0;
              for (i = 0; i < rows.length; i++) {
                rows[i] = fbResp2plurkItem(rows[i]);
              }
              Responses._renderList(o, rows);
            };
            query.wait(expand_callback, function(){expand_callback([]);});  
          } else {
            Responses.fetchItems(o)
          }
          ////}}
        }
      }, 0)
    };
    Plurks.renderPlurk = function (h, l) {
      //{{ fb_in_plurk_hack: h 為第一個參數 h
      var fb_mode = (h.fb_uid ? true : false);
      ////}}
      var x = Plurks;
      var d = SiteState.getPlurkUser(h);
      if (!d) {
        return null
      }
      //{{ //startof fb_mode hack: d為前面var d = SiteState.getPlurkUser(h);中的d
      var tmp_dob = d.date_of_birth;
      var tmp_nc = d.name_color;
      if(fb_mode){
        d.name_color = "3459B2";
        d.date_of_birth = null;
      } 
      ////}} end of fb_mode hack
      var f = "<div class='plurk cboxAnchor' data-pid='{{plurk_id}}' data-rid='{{rid}}' data-uid='{{user_id}}' data-type='{{type}}'><table><tbody><tr><td class='td_img'><div class='p_img'><img src='{{img_src}}'></div></td><td><div id='plurk_cnt_{{plurk_id}}' class='plurk_cnt'><table><tbody><tr class='tr_cnt'><td class='td_qual'></td><td class='td_cnt'></td></tr><tr class='tr_info' style='display: none;'><td class='td_info' colspan='2'></td></tr></tbody></table></div></td></tr></tbody></table></div>";
      f = Handlebars.compile(f);
      var u = (!l) ? "p" + h.id : "m" + h.id;
      if (l) {
        if (jQuery("#" + u).length) {
          return null
        }
      }
      var s = h.content.replace("<script", "");
      var b = null;
      var o = d;
      if (h.replurker_id) {
        b = SiteState.getUserById(h.replurker_id)
      }
      var w = Qualifiers.format(d, h.qualifier, s, false, h.lang, h.id, (b != null));
      var v = w[0];
      //startof fb_mode hack: w為前一行的w[] h為前兩行h.lang的h; 
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
        var obj_a = w[0].getElementsByTagName("a")[0]; 
        obj_a.id = "uA_" + h.id;
        obj_a.href = "http://www.facebook.com/profile.php?id=" + h.fb_uid;
        obj_a.innerHTML = FB.getUser(h.fb_uid, fillUAName(h.id)).name;
        obj_a.target = "_blank";
      }
      // endof fb_mode hack
      var p = w[1];
      if (b) {
        o = b;
        var r = SiteState.getSessionUser();
        var y = (r && r.default_lang) || "en";
        var e = Qualifiers._(b.gender, y, "replurks");
        p = AJS.DIV({
          c: "text_holder"
        }, v, p);
        v = AJS.SPAN(AJS.A({
          href: "/" + b.nick_name,
          c: "name"
        }, b.display_name || b.nick_name), AJS.SPAN({
          c: "qualifier q_replurks"
        }, e))
      }
      var c;
      //{{ //startof fb_mode hack: l為此function的第二個參數l, c為前一行的var c, h為前面用到 h.lang 中的 h,  s為前面 var o = d; 中的 o
      if (!l) {
        c = (fb_mode? FB.getUser(h.fb_uid, fillUImgSrc(h.id)).pic_square : Users.getUserImgSrc(o));
      }
      ////}}
      var q = {
        plurk_id: h.plurk_id,
        rid: (h.id != h.plurk_id) ? h.id : "",
        user_id: h.user_id,
        span_qual: v.outerHTML,
        img_src: c,
        type: (l) ? "response" : "plurk"
      };
      var g = jQuery(f(q));
      g.find(".td_qual").append(v);
      g.find(".td_cnt").append(p);
      if (l) {
        g.find(".td_img").empty()
      }
      var m = g.get(0);
      var a = g.find("tr").get(0);
      m.id = u;
      var j = $plurks[u] = {
        obj: h,
        div: m,
        image: g.find(".p_img").get(0),
        div_cnt: p,
        td_cnt: g.find(".td_cnt").get(0),
        cnt: g.find(".plurk_cnt").get(0),
        tr_cnt: g.find(".tr_cnt").removeAttr("class").get(0),
        tr_info: g.find(".tr_info").get(0),
        td_info: g.find(".td_info").get(0),
        tr: a
      };
      Plurks._renderIcons(j, l, o);
      if (!l) {
        AJS.AEV(m, "mouseover", AJS.$p(x._plurkMouseOver, m));
        AJS.AEV(m, "mouseout", AJS.$p(x._plurkMouseOut, m));
        AJS.ACN(a, getPD(m).td_resp_count = AJS.TD({
          c: "td_response_count"
        }, getPD(m).response_count = AJS.SPAN({
          c: "response_count"
        }, h.response_count)));
        var t = AJS.$p(Plurks.expand, m);
        jQuery(m).click(function (z) {
          if (jQuery(z.target).hasClass("emoticon_my") && EmoAddHelper.shouldIgnoreCustomEmoticonClickOnTimeline) {
            return
          }
          if (jQuery(z.target).parent("a.pictureservices").length > 0) {
            return
          }
          t()
        });
        if (SiteState.canEdit()) {
          if ((Poll.current_data.unread_plurks[h.id])) {
            AJS.addClass(m, "new")
          }
        }
        if (h.response_count == 0) {
          AJS.hideElement(getPD(m).response_count)
        }
      }
      if (l) {
        AJS.onEvent(m, "mouseover", AJS.$p(Responses.responseMouseOver, m));
        AJS.onEvent(m, "mouseout", AJS.$p(Responses.responseMouseOut, m));
        if (getPD($dp.current_div).obj.owner_id == h.user_id) {
          AJS.addClass(m, "highlight_owner")
        }
      }
      if (d.nick_name == "plurkbuddy" && SiteState.canEdit()) {
        AJS.addClass(m, "glow")
      }
      if (h.is_unread == 2) {
        AJS.addClass(m, "muted")
      }
      Plurks.applyNameColor(m, h);
      //{{ //startof fb_mode hack: d為一開始var d = SiteState.getPlurkUser(...);中的d 
      if(fb_mode){
        d.date_of_birth = tmp_dob;
        d.name_color = tmp_nc;
      }
      ////}} end of fb_mode hack
      return m
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
    //Remove http://go.plurk.com redirection
    eval("Media._hideLink = " + Media._hideLink.toString().replace("window.open(b","window.open(c.href"));
    document.body.removeChild(AJS.$("form_holder")); //要重載form_holder
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
      if(TopBar)
        TopBar.showProfile();   
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
