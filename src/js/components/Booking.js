import {select, templates, settings, classNames} from "../settings.js";
import AmountWidget from "./AmountWidget.js";
import DatePicker from "./DatePicker.js";
import HourPicker from "./HourPicker.js";
import utils from "../utils.js";


class Booking {
  constructor(element) {
    const thisBooking = this;

    thisBooking.selectedTable = null;

    thisBooking.render(element);
    thisBooking.initWidgets();
    thisBooking.getData();
  }

  getData() {

    const thisBooking = this;

    const startDateParam = settings.db.dateStartParamKey + '=' + utils.dateToStr(thisBooking.datePickerWidget.minDate);
    const endDateParam = settings.db.dateEndParamKey + '=' + utils.dateToStr(thisBooking.datePickerWidget.maxDate);

    const params = {
      bookings: [
        startDateParam,
        endDateParam,
      ],
      eventsCurrent: [
        settings.db.notRepeatParam,
        startDateParam,
        endDateParam,
      ],
      eventsRepeat: [
        settings.db.repeatParam,
        endDateParam,
      ],
    };

    // console.log('getData params', params);

    const urls = {
      bookings: settings.db.url + '/' + settings.db.bookings
        + '?' + params.bookings.join('&'),
      eventsCurrent: settings.db.url + '/' + settings.db.events
        + '?' + params.eventsCurrent.join('&'),
      eventsRepeat: settings.db.url + '/' + settings.db.events
        + '?' + params.eventsRepeat.join('&'),
    };

    console.log('getData urls', urls);

    Promise.all([
      fetch(urls.bookings),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ])
      .then(function (allResponse) {
        const bookingsResponse = allResponse[0];
        const eventsCurrentsResponse = allResponse[1];
        const eventsRepeat = allResponse[2];
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentsResponse.json(),
          eventsRepeat.json(),
        ]);
      })
      .then(function ([bookings, eventsCurrents, eventsRepeat]) {
        // console.log('bookings', bookings);
        // console.log('bookings', eventsCurrents);
        // console.log('bookings', eventsRepeat);
        thisBooking.parseDate(bookings, eventsCurrents, eventsRepeat);
      });
  }

  parseDate(bookings, eventsCurrents, eventsRepeat) {
    const thisBooking = this;

    thisBooking.booked = {};

    for (let item of eventsCurrents) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    for (let item of bookings) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    const minDate = thisBooking.datePickerWidget.minDate;
    const maxDate = thisBooking.datePickerWidget.maxDate;


    for (let item of eventsRepeat) {
      if (item.repeat == 'daily') {
        for (let loopDate = minDate; loopDate <= maxDate; loopDate = utils.addDays(loopDate, 1)) {
          thisBooking.makeBooked(utils.dateToStr(loopDate), item.hour, item.duration, item.table);
        }
      }
    }

    thisBooking.updateDOM();

    console.log('thisBooking.booked', thisBooking.booked);
  }

  makeBooked(date, hour, duration, table) {
    const thisBooking = this;

    if (typeof thisBooking.booked[date] === 'undefined') {
      thisBooking.booked[date] = {};
    }

    const startHour = utils.hourToNumber(hour);

    for (let hourBlock = startHour; hourBlock < startHour + duration; hourBlock += 0.5) {
      // console.log('loop', hourBlock);

      if (typeof thisBooking.booked[date][hourBlock] === 'undefined') {
        thisBooking.booked[date][hourBlock] = [];
      }

      thisBooking.booked[date][hourBlock].push(table);
    }
  }

  updateDOM() {
    const thisBooking = this;

    thisBooking.date = thisBooking.datePickerWidget.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPickerWidget.value);

    let allAvailable = false;

    if (
      typeof thisBooking.booked[thisBooking.date] == 'undefined'
      ||
      typeof thisBooking.booked[thisBooking.date][thisBooking.hour] == 'undefined'
    ) {
      allAvailable = true;
    }

    for (let table of thisBooking.dom.tables) {
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      if (!isNaN(tableId)) {
        tableId = parseInt(tableId);
      }

      if (
        !allAvailable
        &&
        thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId)
      ) {
        table.classList.add(classNames.booking.tableBooked)
      } else {
        table.classList.remove(classNames.booking.tableBooked)
      }
    }
  }

  render(element) {
    const thisBooking = this;

    const generatedHTML = templates.bookingWidget();
    thisBooking.dom = {};
    thisBooking.dom.wrapper = element;
    thisBooking.dom.wrapper.innerHTML = generatedHTML;
    thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(select.booking.peopleAmount);
    thisBooking.dom.hoursAmount = thisBooking.dom.wrapper.querySelector(select.booking.hoursAmount);
    thisBooking.dom.datePickerWidget = thisBooking.dom.wrapper.querySelector(select.widgets.datePicker.wrapper);
    thisBooking.dom.hourPickerWidget = thisBooking.dom.wrapper.querySelector(select.widgets.hourPicker.wrapper);
    thisBooking.dom.tables = thisBooking.dom.wrapper.querySelectorAll(select.booking.tables);
    thisBooking.dom.plan = thisBooking.dom.wrapper.querySelector(select.booking.plan);
    thisBooking.dom.bookingSubmit = thisBooking.dom.wrapper.querySelector(select.booking.bookingSubmit);
    thisBooking.dom.address = thisBooking.dom.wrapper.querySelector(select.booking.address);
    thisBooking.dom.phone = thisBooking.dom.wrapper.querySelector(select.booking.phone);
  }

  initWidgets() {
    const thisBooking = this;

    thisBooking.peopleAmountWidget = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.hoursAmountWidget = new AmountWidget(thisBooking.dom.hoursAmount);
    thisBooking.datePickerWidget = new DatePicker(thisBooking.dom.datePickerWidget);
    thisBooking.hourPickerWidget = new HourPicker(thisBooking.dom.hourPickerWidget);

    thisBooking.dom.peopleAmount.addEventListener('updated', function () {

    });
    thisBooking.dom.hoursAmount.addEventListener('updated', function () {

    });

    thisBooking.dom.wrapper.addEventListener('updated', function () {
      thisBooking.updateDOM();
    });

    thisBooking.dom.plan.addEventListener('click', function (event) {
      event.preventDefault();
      thisBooking.initTables(event);
    });
    // console.log('1111', thisBooking.dom.plan)

    thisBooking.dom.datePickerWidget.addEventListener('updated', function(){
      thisBooking.resetSelectedTable();
    });
    thisBooking.dom.hourPickerWidget.addEventListener('updated', function(){
      thisBooking.resetSelectedTable();
    });
console.log('123', thisBooking.dom.bookingSubmit)
    thisBooking.dom.bookingSubmit.addEventListener('click', function(event){
      event.preventDefault();
      thisBooking.sendBooking();
    })
  }

  initTables(event) {
    const thisBooking = this;
    const clickedTable = event.target;

    if (clickedTable.classList.contains('table')) {
      if (clickedTable.classList.contains(classNames.booking.tableBooked)) {
        alert('This table is already booked!');
        return;
      }

      if (clickedTable.classList.contains('selected')) {
        clickedTable.classList.remove('selected');
        thisBooking.selectedTable = null;
      } else {
        const activeTable = thisBooking.dom.plan.querySelector('.table.selected');
        if (activeTable) {
          activeTable.classList.remove(classNames.booking.tableSelected);
        }
        clickedTable.classList.add('selected');
        thisBooking.selectedTable = clickedTable.getAttribute(settings.booking.tableIdAttribute);
      }
    }
  }

  resetSelectedTable() {
    const thisBooking = this;

    const activeTable = thisBooking.dom.plan.querySelector('.table.selected');
    if (activeTable) {
      activeTable.classList.remove('selected');
    }
    thisBooking.selectedTable = null;
  }

  sendBooking(){
    const thisBooking = this;
    const url = settings.db.url + '/' + settings.db.bookings;

    console.log('hhmm', thisBooking.hourPickerWidget.value);
    const payload = {
      date: thisBooking.datePickerWidget.value,
      hour: thisBooking.hourPickerWidget.value,
      table: thisBooking.selectedTable !== null ? parseInt(thisBooking.selectedTable) : null,
      duration: thisBooking.hoursAmountWidget.value,
      ppl: thisBooking.peopleAmountWidget.value,
      starters: [],
      phone: thisBooking.dom.phone.value,
      address: thisBooking.dom.address.value,
    }

    const startersInputs = thisBooking.dom.wrapper.querySelectorAll('[name="starter"]');
    for (let starter of startersInputs) {
      if (starter.checked) {
        payload.starters.push(starter.value);
      }
    }

    console.log('Booking payload:', payload);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    fetch(url, options)
      .then(function (response) {
        return response.json();
      })
      .then(function (parsedResponse) {
        console.log('Booking response:', parsedResponse);

        thisBooking.getData();
      });
  }
}

export default Booking;