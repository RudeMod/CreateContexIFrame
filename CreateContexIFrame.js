/*!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
************************************************************************
Переменные которые требуется обьявить на странце к которой подключается скрипт:

  var ContexLink  - адрес .asp страницы содержания конктекстного фрейма и его обработки.

  var NotUseContFrAnim - Необязательный параметр с помощью которого можно отключить
                         анимацию конт. фрейма.
************************************************************************
/////////////////////////////////////////////////////////////////////////
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
*/

var ContexLink = "";
var NotUseContFrAnim = false;

function getCoords(elem) {  //Берет результат elem.getBoundingClientRect() и прибавляет текущую прокрутку документа.
  // Получаем прямоугольник.
  var box = elem.getBoundingClientRect();

  var docEl = document.documentElement;
  var body = document.body;

  // Считаем прокрутку страницы.
  var scrollTop = window.pageYOffset || body.scrollTop || docEl.scrollTop;
  var scrollLeft = window.pageXOffset || body.scrollLeft || docEl.scrollLeft;

  // Документ может быть смещен относительно левого верхнего угла. Получим это смещение.
  var clientTop = docEl.clientTop || body.clientTop || 0;
  var clientLeft = docEl.clientLeft || body.clientLeft || 0;

  // Добавим прокрутку к координатам окна и вычтем смещение html/body, чтобы получить координаты всего документа.
  var top   =  box.top  + scrollTop  - clientTop;
  var left  =  box.left + scrollLeft - clientLeft;
  var right =  box.right  + scrollLeft - clientLeft;
  var bottom = box.bottom + scrollTop  - clientTop;

  // Координаты округляются вызовом Math.round() т.к. в Firefox бывают дробные пиксели.
  return { top: Math.round(top), left: Math.round(left), right: Math.round(right), bottom: Math.round(bottom)};
}

var ContexDiv = document.createElement("div");  //- Блок, представляющий из себя контекстное меню с открываемым внутри фреймом, содержащем
ContexDiv.id = "ContexDiv";                     //значения для соответствующего поля
ContexDiv.style.border = "1px solid gray";
ContexDiv.style.zIndex  = 1000;
ContexDiv.style.position = "absolute";
ContexDiv.style.backgroundColor = "white";
ContexDiv.style.display = "none";
document.body.appendChild(ContexDiv);

var ContexFrame = document.createElement("iframe"); //Фрейм, открывающийся внутри ContexDiv
ContexFrame.id = "ContexFrame";
ContexFrame.name = "ContexFrame";
ContexFrame.src = "";
ContexFrame.style.border = "0px";
ContexFrame.style.width = "100%";
ContexFrame.style.height = "100%";
ContexFrame.style.display = "none";
ContexFrame.onload = function() {
  if (FocusContexElem) {
    ContexSpinner.style.display = "none";
    this.style.display = "inline";
  }
}
ContexDiv.appendChild(ContexFrame);

var ContexSpinner = document.createElement("div"); //Анимация при прогрузке фрейма
ContexSpinner.id = "ContexSpinner";
ContexSpinner.style.marginLeft= "48%";
ContexSpinner.style.marginTop = "25%";
ContexSpinner.style.background = "url('/img/spinner.gif') no-repeat";
ContexSpinner.style.height = "16px";
ContexSpinner.style.width = "16px";
ContexSpinner.style.display = "block";
ContexDiv.appendChild(ContexSpinner);

var ContexFrTempInput = document.createElement("input");//Скрытое текстовое поле для элементов, в которое заносится альтернативное значение из
ContexFrTempInput.type = "text";                        //контекстного блока, если явно не указан другой элемент
ContexFrTempInput.id = "ContexFrTempInput";

var FocusContexElem = null;   //- Пуременная для указания фрейму значения какого элемента изменять и указывает по какому полю контекстное меню открыто ранее.
var FocusContexAltElem = null;//- Для указания альрнативного элемента в который сохраняет только ID значение.
var TypeContexFrame = null;   //- Хранит тип значений открытого фрейма.
var ContexSearch = "";        //- Последний поисковый запрос для контекстног меню.
var ContexReloadFrameTimerID; //- Переменная для хранения таймера.
var WaitSearch_RldFr = 1500;  //- Пауза перед обновлением контекстного фрейма во время поиска.
var ContexResultFocus = -1;    //- Индекс результирующего элемента на котором сейчас стоит фокус.

function hideContxFr() {
  ContexFrame.style.display = "none";
  ContexSpinner.style.display = "block";
}

function CreateContFrame(Elem, AltElem, Type, W, H){
/*
  - Elem    - Указывается элемент для которого непосредственно вызывается контекстный фрейм. Также именно в значение этого элемента будет
              занесено value выбранного пункта в контекстном окне.
  - AltElem - Альтернативный элемент. Имеет различные назначения, к примеру может использоваться для занесения в скрытое поле только ID
              значение, в то время как в Elem будет занесено как ID, так и полное название выбранной записи (К примеру полное название фирмы.),
              тоесть полное значение value выбранного пункта в контекстном окне.
              На некоторых страницах может не использоваться, тогда принимает значение "0" или this в зависимости от необходимсоти занесения
              альтенативного значения в сам Elem.
  - Type    - Указывает для контекстной страницы какие данные подгружать. Вносится в формате "Link.asp?" + Type + "=1"
  - W       - Указывает ширину контекстного окна.
  - H       - Указывает высоту контекстного окна.
*/

  var CW = ContexFrame.contentWindow;

  if (CW.document.getElementsByClassName("F")[ContexResultFocus]) { //Очищаем прошлые выделенные элементы если были
    CW.document.getElementsByClassName("F")[ContexResultFocus].style.backgroundColor = "";
  }

  ContexResultFocus = -1;

  ///////////////////////////////////////////////
  /////Определяем положение контекстного блока///
  ///////////////////////////////////////////////
  var box = Elem.getBoundingClientRect();

  var pos_left;
  var pos_top;
  // ContexDiv.style.top  = "";
  // ContexDiv.style.bottom = "";
  // ContexDiv.style.left = "";
  // ContexDiv.style.right = "";

  // if (document.body.clientWidth > (getCoords(Elem).left + W)) { //Данное условие не обязательно, однако добавлено чтобы избежать разного
    // pos_left = getCoords(Elem).left + "px";                     //расположения конт. фрейма относительно центра страницы.
  // }
  // else {                                                         //Положение слева
    if ((window.innerWidth - (box.left + W)) > 0) {
      pos_left = getCoords(Elem).left + "px";
      // ContexDiv.style.left = "0px";
    }
    else {
      if ((getCoords(Elem).right - W) > 0) {
        pos_left = (getCoords(Elem).right - W) + "px";
        // ContexDiv.style.right = "0px";
      }
      else {
        pos_left = getCoords(Elem).left + "px";
        // ContexDiv.style.left = "0px";
      }
    }
  // }

  if ((window.innerHeight - (box.bottom + H)) > 0) { //Положение сверху
    pos_top = getCoords(Elem).bottom + "px";
    ContexDiv.style.boxShadow = "4px 4px 2px -2px rgba(0, 0, 0, 0.5)";
    // ContexDiv.style.top = "0px";
  }
  else {
    if ((getCoords(Elem).top - H) > 0) {
      pos_top = (getCoords(Elem).top - H) + "px";
      ContexDiv.style.boxShadow = "4px -4px 2px -2px rgba(0, 0, 0, 0.5)";
      // ContexDiv.style.bottom = "0px";
    }
    else {
      pos_top = getCoords(Elem).bottom + "px";
      ContexDiv.style.boxShadow = "4px 4px 2px -2px rgba(0, 0, 0, 0.5)";
      // ContexDiv.style.top = "0px";
    }
  }
  ///////////////////////////////////////////////

  ///////////////////////////////////////////////
  // Внутренние функции
  ///////////////////////////////////////////////

  //----------------------------------------------------------------
  // • Функция смены положения контектсного фрейма
  //----------------------------------------------------------------
  ReconstructContDiv = function() {
    ContexDiv.style.left  = pos_left;
    ContexDiv.style.top  = pos_top;
    ContexDiv.style.height = H + "px";
    ContexDiv.style.width = W + "px";
  }

  //----------------------------------------------------------------
  // • Функция для стрелочной навигации по результирующему набору
  //----------------------------------------------------------------
  StepContexResultFocus = function(KeyCode) {
    //KeyCode = 38 : Кнопка вверх
    //KeyCode = 40 : Кнопка вниз

    if (ContexFrame.style.display != "inline") { return; }

    if (CW.document.getElementsByClassName("F").length == 0) { return; }

    if (CW.document.getElementsByClassName("F")[ContexResultFocus]) {
      CW.document.getElementsByClassName("F")[ContexResultFocus].style.backgroundColor = "";
    }

    if (ContexResultFocus == -1) {
      if (KeyCode == 38) {
        ContexResultFocus = (CW.document.getElementsByClassName("F").length - 1);
      }
      else { //KeyCode == 40
        ContexResultFocus = 0;
      }

      CW.document.getElementsByClassName("F")[ContexResultFocus].style.backgroundColor = "lightblue";

      var F_offsetTop = CW.document.getElementsByClassName("F")[ContexResultFocus].offsetTop;

      CW.scrollTo(0,F_offsetTop - (ContexFrame.offsetHeight / 2));
      return;
    }

    var i = 0;

    if (KeyCode == 40) {
      do {
        if (i == CW.document.getElementsByClassName("F").length) {
          return;
        }

        ContexResultFocus++;
        i++;

        if (ContexResultFocus > (CW.document.getElementsByClassName("F").length - 1)) {
          ContexResultFocus = 0;
        }
      } while(CW.document.getElementsByClassName("F")[ContexResultFocus].style.display == "none");
    } //end if
    else { //KeyCode == 38
      do {
        if (i == CW.document.getElementsByClassName("F").length) {
          return;
        }

        ContexResultFocus--;
        i++;

        if (ContexResultFocus < 0) {
          ContexResultFocus = (CW.document.getElementsByClassName("F").length - 1);
        }// end if
      } while(CW.document.getElementsByClassName("F")[ContexResultFocus].style.display == "none");
    } //end else

    CW.document.getElementsByClassName("F")[ContexResultFocus].style.backgroundColor = "lightblue";

    var F_offsetTop = CW.document.getElementsByClassName("F")[ContexResultFocus].offsetTop;

    CW.scrollTo(0,F_offsetTop - (ContexFrame.offsetHeight / 2));
    return;
  }; //end function

  //----------------------------------------------------------------
  // • Функция перезагрузки контектсного фрейма
  //----------------------------------------------------------------
  ReloadFrame = function () {
    hideContxFr();

    ContexSearch = FocusContexElem.value;
    document.getElementById("ContexFrame").src = ContexLink + "?" + TypeContexFrame +
                                                 "=1&Search=" + escape(ContexSearch);
  }

  if ((typeof($) != "undefined") && (!(NotUseContFrAnim))) {
    if (ContexDiv.style.display == "none") {
      ReconstructContDiv();
      $(ContexDiv).show(100, 'linear');
    }
    else {
      if ((ContexDiv.style.left != pos_left) || (ContexDiv.style.top != pos_top)) {
        $(ContexDiv).fadeOut(50, function() {
          ReconstructContDiv();
          $(this).fadeIn(50);
        });
      }
    }
  }
  else {
    ContexDiv.style.display = "block";
    ReconstructContDiv();
  }

  var FirstCheck = (((ContexDiv.innerHTML == "") || (ContexSearch != "")) && (FocusContexElem != Elem));
  var SecondCheck = ((Type.toString().length > 0) && (TypeContexFrame != Type.toString()));

  if ((FirstCheck) || (SecondCheck)){
    hideContxFr();

    TypeContexFrame = Type.toString();
    ContexFrame.src = ContexLink + '?' + TypeContexFrame + '=1';
    ContexSearch = "";
  }

  typeof(Old_ElemonINPUT) != "undefined" ? FocusContexElem.oninput = Old_ElemonINPUT : '';
  typeof(Old_ElemKeyDOWN) != "undefined" ? FocusContexElem.onkeydown = Old_ElemKeyDOWN : '';
  typeof(Old_DocMouseDOWN) != "undefined" ? document.onmousedown = Old_ElemKeyDOWN : '';

  FocusContexElem = Elem;
  if (AltElem) {FocusContexAltElem = AltElem}
  else         {FocusContexAltElem = ContexFrTempInput} //- Если AltElem не используется, то значение, которое должно было быть направлено в AltElem (если бы он существовал),
                                                        //отправляется в ContexFrTempInput

  //ONINPUT//////////////////////////////////////////////////////////////////////////////////////////////
  if (Elem.oninput) {
    Old_ElemonINPUT = Elem.oninput;
  }
  else {
    Old_ElemonINPUT = null;
  }

  Elem.oninput = function(e) {                 //- Событие перезагружает фрейм с новым поиском в процессе ввода пользлователем
    Old_ElemonINPUT ? Old_ElemonINPUT(e) : ''; //текста в переданное поле Elem

    if (typeof(ContexReloadFrameTimerID)!= "undefined") {
      clearTimeout(ContexReloadFrameTimerID);
    }

    hideContxFr();
    ContexResultFocus = -1;
    ContexReloadFrameTimerID = setTimeout(function() {ReloadFrame();}, WaitSearch_RldFr);
  }

  //ONKEYDOWN//////////////////////////////////////////////////////////////////////////////////////////////
  if (Elem.onkeydown) {
    Old_ElemKeyDOWN = Elem.onkeydown;
  }
  else {
    Old_ElemKeyDOWN = null;
  }

  Elem.onkeydown = function(e) {
    Old_ElemKeyDOWN ? Old_ElemKeyDOWN(e) : '';

    //ESC
    if (e.keyCode==27) {
      DelContxFrame();
      return;
    }
    
    //Стрелки вверх и вниз
    if (((e.keyCode == 40) || (e.keyCode == 38)) && (Elem.tagName == "INPUT")) { 
      StepContexResultFocus(e.keyCode);
      //return false;
    }

    //Enter
    if (e.keyCode==13) {  
      if (typeof(ContexReloadFrameTimerID)!= "undefined") {
        clearTimeout(ContexReloadFrameTimerID);
      }

      if ((ContexResultFocus != -1)) {
        CW.document.getElementsByClassName("F")[ContexResultFocus].click();
        return;
      }

      if (Elem.tagName != "INPUT") {
        return;
      }

      if (ContexSearch =="") {
        ReloadFrame();
        return false;
      }
      else {
        ContexSearch = "";
        DelContxFrame(Elem);
        return;
      }
    }
  }

  var CordElem = Elem.getBoundingClientRect();    //- Данные о расположении переданного элемента

  //ONMOUSEDOWN//////////////////////////////////////////////////////////////////////////////////////////////
  if (document.onmousedown) {
    Old_DocMouseDOWN = document.onmousedown;
  }
  else {
    Old_DocMouseDOWN = null;
  }

  document.onmousedown = function(e) {           //- Функция скрытия контекстного div-а, если нажата кнопка мыши на главной странице вне
    Old_DocMouseDOWN ? Old_DocMouseDOWN(e) : ''; //  элемента или фрейма.

    X = e.clientX;
    Y = e.clientY;

    if((Y < CordElem.top) || (Y > CordElem.bottom) || (X < CordElem.left) || (X > CordElem.right)){
      DelContxFrame();
    }
  }
}

function DelContxFrame() {
  if ((typeof($) != "undefined") && (!(NotUseContFrAnim))) {
    $(ContexDiv).hide(100, 'linear');
  }
  else {
    ContexDiv.style.display="none";
  }

  ContexFrTempInput.value = "";
  typeof(Old_ElemonINPUT) != "undefined" ? FocusContexElem.oninput = Old_ElemonINPUT : '';
  typeof(Old_ElemKeyDOWN) != "undefined" ? FocusContexElem.onkeydown = Old_ElemKeyDOWN : '';
  typeof(Old_DocMouseDOWN) != "undefined" ? document.onmousedown = Old_DocMouseDOWN : '';
}