/* global Flickity */

import {select} from "../settings.js";

class Carousel {
  constructor() {
    const thisCarousel = this;

    thisCarousel.render();
    thisCarousel.initPlugin();
  }

  render() {
    const thisCarousel = this;

    thisCarousel.dom = {
      carousel: document.querySelector(select.carousel),
    };
  }

  initPlugin() {
    const thisCarousel = this;

    thisCarousel.flickity = new Flickity(thisCarousel.dom.carousel, {
      cellAlign: 'left',
      contain: true,
      autoPlay: 3000,
      wrapAround: true,
      prevNextButtons: true,
      pageDots: true,
    });
  }
}
export default Carousel;
