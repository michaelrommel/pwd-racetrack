var U1, U2, U3;
var sdd = 1,
  spgnum = 0;
var sWin;

var dd = 1,
  dpgnum = 0;
var diag, dWin;

function vdt(obj, lowval, hival) {
  if (obj.value < lowval || obj.value > hival) console.log("Invalid Value!");
}

// global vars

var nC, nL, nR, OS, W1, W2, W3, tl, nH, pn, pn2, sums, tng, scoreg, ident;
W1 = 10;
W2 = 100;
W3 = 100;
var pgnum = 0,
  dS;
var today;

function d(m) {
  console.log(m);
}

function check3(i, j) {
  // Goal: AVOID HAVING CARS IN CONSECUTIVE RACES IN THE SAME LANES
  var lM = 0;
  for (l = 0; l < nL; ++l) if (pn[j * nL + l] == pn2[(i - 1) * nL + l]) ++lM;
  return lM;
}

function check2(i, j) {
  // Goal: AVOID HAVING CARS IN CONSECUTIVE RACES
  var cM = 0;
  for (l = 0; l < nL; ++l)
    for (m = 0; m < nL; ++m) if (pn[j * nL + l] == pn2[(i - 1) * nL + m]) ++cM;
  return cM;
}

function check1(i, j) {
  // Goal: KEEP THE RACE COUNTS EVEN
  var rC = new make(nC);
  var car;

  for (l = 0; l < nC; ++l) rC[l] = sums[l];

  for (m = nL * j; m < nL * (j + 1); ++m) {
    car = pn[m];
    rC[car - 1]++;
  }

  var dev = 0;
  var tgt = ((i + 1) * nL) / nC;
  for (l = 0; l < nC; ++l) {
    dev += (rC[l] - tgt) * (rC[l] - tgt);
  }
  dev = dev / ((i + 1) * nL);
  return dev;
}

function rateRace(i, j) {
  var retVal = 0;
  if (W1) retVal += W1 * check1(i, j);
  if (i) {
    // these checks don't make sense for the 1st race (race 0)
    if (W2) retVal += W2 * check2(i, j);
    if (W3) retVal += W3 * check3(i, j);
  }
  d("raterace: i=" + i + "; j=" + j + "; retVal=" + retVal);
  return retVal;
}

function orderRaces() {
  if (W1 + W2 + W3 == 0) {
    for (z = 0; z < nH * nL; ++z) pn2[z] = pn[z];
    return;
  }

  var i, j, k, l, m;
  var bR, bRt;
  var nU = new make(nH);
  var car;

  for (m = 0; m < nC; m++) sums[m] = 0;

  for (m = 0; m < nH; m++) nU[m] = 1;

  var tm0, now;
  now = new Date();
  tm0 = now.getTime();

  for (i = 0; i < nH; i++) {
    if (i == 1) {
      now = new Date();
      tm0 = Math.round(((now.getTime() - tm0) * nH) / 1000);
      if (tm0 > 30)
        console.log("Estimated time to optimize chart is " + tm0 + " seconds.");
    }
    bR = nH - 1;
    bRt = 10000;

    k = 0;
    for (j = 0; j < nH; j++) {
      if (nU[j]) {
        k = rateRace(i, j);
        if (k < bRt - 0.000001) {
          bRt = k;
          bR = j;
          d("was better");
        }
      }
    }
    d("orderRaces: for i=" + i + "; j=" + bR + " was selected");
    ln = i;
    for (l = 0; l < nL; ++l) {
      car = pn[nL * bR + l];
      pn2[nL * i + l] = car;
      sums[car - 1]++;
      ln += ", " + car;
    }
    d("Heat " + ln);
    nU[bR] = 0;
  }
  return;
}

function make(num) {
  var i;
  //var this = new Array(num);

  for (i = 0; i < num + 1; i++) this[i] = 0;
  return this;
}
// mc builds array of cell column names
function mc(t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12) {
  i = 0;
  //var this = new Array(12);
  this[i++] = t1;
  this[i++] = t2;
  this[i++] = t3;
  this[i++] = t4;
  this[i++] = t5;
  this[i++] = t6;
  this[i++] = t7;
  this[i++] = t8;
  this[i++] = t9;
  this[i++] = t10;
  this[i++] = t11;
  this[i++] = t12;
  return this;
}
// ma builds an array from the condition parameters
// Parameters:
//  1-elements per generator
//  2-number of generators available
//  3-12-Type of chart if this many generators are used
//    -1 No chart
//    0 "PPNB" Misc,
//    1 "PPN"
//    2 "PN"
//    3 "CPN"
//  9-n-generator elements

// Example: 4Lanes, 19Cars
//   if (nC == 19) T = ma(6, 1, 1, 2, 1, 1, 3, 2, 3, 4, 6, 1, 7, 17, 16, 15, 13, 18, 12);

// 1st digit: maximum number of rounds this generator can produce
// 2nd block (can be min. 1 digit, up to the number from 1st digit elementsi)
//   describes the type of chart generated by each generator
//    e.g. if 6 rounds are supported, then the next 6 elements describe
//    the chart type for each of the 6 generators
//    -1 No chart
//    0 "PPNB" Misc,
//    1 "PPN"
//    2 "PN"
//    3 "CPN"
// 3rd block (from no_of_rounds+2 onwards:
//    describes the generators, telling which number you add to lane 1 to get
//    the car number for lane 2 and so on

function ma( ng, t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12,
  p0, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14)
{
  d("ma[0] = " + ng);
  d("ma[1] = " + t1);
  d("ma[2] = " + t2);
  d("ma[3] = " + t3);
  d("ma[4] = " + t4);
  // TODO: why 12? Probably because of the 12 t parameters
  // Presumably because the numbers for the generators will then
  // start at a fixed position 13 in the tma1 array.
  var hdr = 12;
  var i = 0;
  // in total there are 20 possible parameters to this function
  var tma1 = new Array(28);
  tma1[i++] = hdr; // T[0]
  tma1[i++] = t1;
  tma1[i++] = t2;
  tma1[i++] = t3;
  tma1[i++] = t4;
  tma1[i++] = t5;
  tma1[i++] = t6;
  tma1[i++] = t7;
  tma1[i++] = t8;
  tma1[i++] = t9;
  tma1[i++] = t10;
  tma1[i++] = t11;
  tma1[i++] = t12;

  // log the current array
  for (j = 0; j <= 13; j++) d("ma[" + j + "] = " + tma1[j]);

  // the maximum number of rounds that this configuration can produce
  tng = ng;
  d("tng = " + tng);
  tma1[i++] = p0; // T[13]
  tma1[i++] = p1;
  tma1[i++] = p2;
  tma1[i++] = p3;
  tma1[i++] = p4;
  tma1[i++] = p5;
  tma1[i++] = p6;
  tma1[i++] = p7;
  tma1[i++] = p8;
  tma1[i++] = p9;
  tma1[i++] = p10;
  tma1[i++] = p11;
  tma1[i++] = p12;
  tma1[i++] = p13;
  tma1[i++] = p14;

  // log the current full array
  for (j = 0; j <= 27; j++) d("ma[" + j + "] = " + tma1[j]);

  // if the number of elements per generator is less than 12
  // with 12 being the maximum I have seen in the charts
  if (ng < 12) {
    // start from the end of the array
    // copy some parameters to the end of the array starting from index 13
    for (j = 27; j >= 13; j--)
      tma1[j] = tma1[j - 12 + ng];
    // this extends the end of the array with 11 addtional -1 elements
    for (j = ng + 1; j <= 12; j++)
      tma1[i++] = -1;
  }
  for (j = 0; j <= 27; j++) d("ma[" + j + "] = " + tma1[j]);
  return tma1;
}

function cval(tg) {
  var i, r, l, tc, k;
  // creates an array with number of cars + 1 elements
  var count = new make(nC + 1);

  // resets the array to zero
  // TODO: check what is with element
  // index 0 and the last one?!
  for (i = 1; i <= nC; i++) count[i] = 0;

  // iterate over the number of rounds, index starts at 0
  for (r = 0; r < nR; r++) {
    // iterate over the number of lanes
    for (l = 1; l <= nL; l++) {
      // if it is not the first lane
      if (l > 1) {
        // reset counter index to 1 tc is a car number
        tc = 1;
        // iterate over the generator digits downwards
        // means look, if car 1 appeard in lane l, which
        // cars would appear in the lanes below l
        for (k = l - 1; k >= 1; k--) {
          // tg here is the gens array of all the generator digits
          // r * (nL - 1) is the index of the first generator digit
          // for this round, so calculate a new car number
          tc -= tg[k + r * (nL - 1)];
          // wrap around if needed
          if (tc < 1) tc += nC;
          // increment the counter, that this car would be selected
          count[tc]++;
        }
      }
      // if it is not the last lane
      if (l < nL) {
        // reset car number to 1
        tc = 1;
        // iterate over remaining generator digits
        // means, look if car 1 appeared in lane l, which
        // cars would appear in lanes above l
        for (k = l; k < nL; k++) {
          // calculate the car numbers which would be selected by
          // this generator
          tc += tg[k + r * (nL - 1)];
          // wrap around if needed
          if (tc > nC) tc -= nC;
          // increment the counter, that this car would be selected
          count[tc]++;
        }
      }
    }
  }
  var rlo = 9999;
  var rhi = 0;
  for (i = 2; i <= nC; i++) {
    // remember the maximum count, how often a car appeared as opponent
    if (count[i] > rhi) rhi = count[i];
    // remember the minimum count, how often a car appeared as opponent
    if (count[i] < rlo) rlo = count[i];
  }
  // if counts are equal, this could be a perfect or complementary perfect race
  if (rhi == rlo) {
    for (i = 1; i < nL; i++) {
      tc = 0;
      for (r = 0; r < nR; r++) tc += tg[i + r * (nL - 1)];
      if (tc % nC != 0) 
        // if over all races the generators sum up to number of cars
        // then two cars appear in switched lanes in those races
        // Return: Perfect-N
        return 2;
    }
    // if we end up here
    // Return: Complementary Perfect-N
    return 3;
  } else if (rhi == rlo + 1) {
    // the number differ at max by one, so it is
    // Return: Partial Perfect-N
    return 1;
  } else {
    // This is a not so good solution
    return 0;
  }
}

function createRaceConfig(numL, numC, numR) {
  nL = numL;
  nC = numC;
  nR = numR;
  var tg = new make(15);
  var T;

  if (nC < nL) nL = nC;

  if (nL == 2) {
    if (nC == 2) T = ma(2, 3, 3, 1, 1);
    if (nC == 3) T = ma(2, 2, 3, 2, 1);
    if (nC == 4) T = ma(2, 1, 1, 3, 2);
    if (nC == 5) T = ma(4, 1, 2, 1, 3, 3, 4, 2, 1);
    if (nC == 6) T = ma(2, 1, 1, 2, 5);
    if (nC == 7) T = ma(6, 1, 1, 2, 1, 1, 3, 3, 2, 1, 4, 5, 6);
    if (nC == 8) T = ma(3, 1, 1, 1, 3, 2, 1);
    if (nC == 9) T = ma(8, 1, 1, 1, 2, 1, 1, 1, 3, 4, 3, 2, 1, 5, 6, 7, 8);
    if (nC == 10) T = ma(4, 1, 1, 1, 1, 4, 3, 2, 1);
    if (nC == 11)
      T = ma(10, 1, 1, 1, 1, 2, 1, 1, 1, 1, 3, 5, 4, 3, 2, 1, 6, 7, 8, 9, 10);
    if (nC == 12) T = ma(5, 1, 1, 1, 1, 1, 5, 4, 3, 2, 1);
    if (nC == 13) T = ma( 12, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 3, 6, 5, 4, 3, 2, 1, 7, 8, 9, 10, 11, 12);
    if (nC == 14) T = ma(6, 1, 1, 1, 1, 1, 1, 6, 5, 4, 3, 2, 1);
    if (nC == 15) T = ma( 12, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 7, 6, 5, 4, 3, 2, 1, 8, 9, 10, 11, 12);
    if (nC == 16) T = ma(7, 1, 1, 1, 1, 1, 1, 1, 7, 6, 5, 4, 3, 2, 1);
    if (nC == 17) T = ma( 12, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 8, 7, 6, 5, 4, 3, 2, 1, 9, 10, 11, 12);
    if (nC == 18) T = ma(8, 1, 1, 1, 1, 1, 1, 1, 1, 8, 7, 6, 5, 4, 3, 2, 1);
    if (nC == 19) T = ma( 12, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 10, 11, 12);
    if (nC == 20) T = ma(9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 9, 8, 7, 6, 5, 4, 3, 2, 1);
    if (nC == 21) T = ma( 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 11, 12);
    if (nC == 22) T = ma(10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1);
    if (nC == 23) T = ma( 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 12);
    if (nC == 24) T = ma( 11, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1);
    if (nC == 25) T = ma( 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1);
    if (nC >= 26 && nC <= 200) T = ma( 12, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1);
  }
  if (nL == 3) {
    if (nC == 3) T = ma(2, 2, 3, 2, 2, 1, 1);
    if (nC == 4) T = ma(2, 2, 3, 3, 3, 1, 1);
    if (nC == 5) T = ma(4, 1, 2, 1, 3, 2, 2, 1, 1, 3, 3, 4, 4);
    if (nC == 6) T = ma(2, 1, 1, 2, 3, 5, 2);
    if (nC == 7) T = ma(2, 2, 3, 2, 4, 5, 3);
    if (nC == 8) T = ma(2, 1, 1, 2, 5, 3, 4);
    if (nC == 9) T = ma(2, 1, 1, 2, 3, 3, 5);
    if (nC == 10) T = ma(2, 1, 1, 2, 7, 4, 5);
    if (nC == 11) T = ma(2, 1, 1, 2, 3, 3, 7);
    if (nC == 12) T = ma(1, 1, 2, 3);
    if (nC == 13) T = ma(4, 1, 2, 1, 3, 3, 9, 7, 11, 10, 4, 6, 2);
    if (nC == 14) T = ma(1, 1, 2, 3);
    if (nC == 15) T = ma(2, 1, 1, 2, 3, 6, 8);
    if (nC == 16) T = ma(2, 1, 1, 2, 3, 6, 9);
    if (nC >= 17 && nC <= 18) T = ma(2, 1, 1, 2, 3, 4, 6);
    if (nC == 19) T = ma(6, 1, 1, 2, 1, 1, 3, 2, 3, 4, 6, 1, 7, 17, 16, 15, 13, 18, 12);
    if (nC == 20) T = ma(2, 1, 1, 2, 3, 4, 7);
    if (nC >= 21 && nC <= 200) T = ma(2, 1, 1, 2, 3, 4, 6);
  }
  if (nL == 4) {
    if (nC == 4) T = ma(2, 2, 3, 3, 3, 3, 1, 1, 1);
    if (nC == 5) T = ma(2, 2, 3, 2, 2, 2, 3, 3, 3);
    if (nC == 6) T = ma(2, 1, 1, 2, 2, 3, 3, 5, 5);
    if (nC == 7) T = ma(2, 2, 3, 2, 2, 4, 5, 5, 3);
    if (nC == 8) T = ma(2, 1, 1, 2, 2, 3, 3, 4, 2);
    if (nC == 9) T = ma(2, 1, 2, 2, 2, 4, 3, 5, 3);
    if (nC == 10) T = ma(2, 1, 1, 2, 2, 5, 3, 3, 6);
    if (nC == 11) T = ma(2, 1, 1, 2, 2, 6, 3, 3, 4);
    if (nC == 12) T = ma(2, 1, 1, 2, 4, 5, 3, 2, 8);
    if (nC == 13) T = ma(2, 2, 3, 2, 4, 12, 11, 9, 1);
    if (nC == 14) T = ma(2, 1, 1, 2, 4, 13, 3, 5, 2);
    if (nC == 15) T = ma(2, 1, 1, 2, 3, 4, 3, 2, 9);
    if (nC == 16) T = ma(2, 1, 1, 2, 3, 7, 3, 5, 9);
    if (nC == 17) T = ma(2, 1, 1, 2, 3, 4, 3, 2, 11);
    if (nC == 18) T = ma(2, 1, 1, 2, 3, 7, 3, 5, 9);
    if (nC == 19) T = ma(2, 1, 1, 2, 3, 4, 3, 5, 13);
    if (nC == 20) T = ma(2, 1, 1, 2, 14, 11, 12, 18, 3);
    if (nC == 21) T = ma(2, 1, 1, 4, 5, 10, 5, 13, 7);
    if (nC == 22) T = ma(2, 1, 1, 4, 5, 7, 8, 12, 21);
    if (nC == 23) T = ma(2, 1, 1, 4, 7, 10, 3, 5, 14);
    if (nC >= 24 && nC <= 26) T = ma(1, 1, 2, 3, 4);
    if (nC == 27) T = ma(2, 1, 1, 4, 5, 6, 7, 19, 25);
    if (nC == 28) T = ma(2, 1, 1, 4, 5, 6, 7, 20, 26);
    if (nC == 29) T = ma(2, 1, 1, 2, 3, 4, 6, 11, 28);
    if (nC == 30) T = ma(2, 1, 1, 2, 3, 4, 6, 11, 29);
    if (nC == 31) T = ma(2, 1, 1, 2, 3, 4, 6, 11, 30);
    if (nC == 32) T = ma(2, 1, 1, 2, 3, 4, 6, 12, 31);
    if (nC == 33) T = ma(2, 1, 1, 2, 3, 4, 6, 12, 32);
    if (nC == 34) T = ma(2, 1, 1, 2, 3, 4, 6, 13, 33);
    if (nC == 35) T = ma(2, 1, 1, 2, 3, 4, 6, 8, 10);
    if (nC == 36) T = ma(2, 1, 1, 2, 3, 4, 6, 8, 12);
    if (nC == 37) T = ma(2, 1, 1, 2, 3, 4, 6, 8, 10);
    if (nC == 38) T = ma(2, 1, 1, 2, 3, 4, 6, 8, 13);
    if (nC >= 39 && nC <= 41) T = ma(2, 1, 1, 2, 3, 4, 6, 8, 10);
    if (nC == 42) T = ma(2, 1, 1, 2, 3, 4, 6, 8, 11);
    if (nC >= 43 && nC <= 47) T = ma(2, 1, 1, 2, 3, 4, 6, 8, 10);
    if (nC == 48) T = ma(2, 1, 1, 2, 3, 4, 6, 8, 11);
    if (nC >= 49 && nC <= 200) T = ma(2, 1, 1, 2, 3, 4, 6, 8, 10);
  }
  if (nL == 5) {
    if (nC == 5) T = ma(4, 2, 3, 2, 3, 2, 2, 2, 2, 3, 3, 3, 3, 1, 1, 1, 1, 4, 4, 4, 4);
    if (nC == 6) T = ma(2, 2, 3, 5, 5, 5, 5, 1, 1, 1, 1);
    if (nC == 7) T = ma(2, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3);
    if (nC == 8) T = ma(2, 1, 1, 2, 2, 3, 2, 3, 3, 4, 5);
    if (nC == 9) T = ma(2, 1, 2, 2, 2, 2, 4, 3, 3, 5, 8);
    if (nC == 10) T = ma(2, 1, 1, 2, 2, 3, 4, 3, 3, 6, 9);
    if (nC == 11) T = ma(2, 2, 3, 2, 2, 3, 5, 9, 9, 8, 6);
    if (nC == 12) T = ma(2, 1, 1, 2, 2, 3, 6, 3, 3, 2, 8);
    if (nC == 13) T = ma(2, 1, 1, 2, 2, 3, 7, 3, 3, 2, 4);
    if (nC == 14) T = ma(1, 1, 2, 2, 3, 6);
    if (nC == 15) T = ma(2, 1, 1, 2, 2, 3, 9, 3, 4, 2, 5);
    if (nC == 16) T = ma(2, 1, 1, 2, 2, 4, 7, 3, 3, 6, 5);
    if (nC == 17) T = ma(2, 1, 1, 2, 2, 4, 16, 3, 3, 2, 8);
    if (nC == 18) T = ma(2, 1, 1, 2, 3, 4, 8, 3, 2, 2, 10);
    if (nC == 19) T = ma(2, 1, 1, 2, 2, 7, 13, 3, 3, 2, 10);
    if (nC == 20) T = ma(2, 0, 0, 2, 2, 3, 7, 3, 3, 2, 4);
    if (nC == 21) T = ma(2, 2, 3, 2, 5, 4, 18, 19, 16, 17, 3);
    if (nC == 22) T = ma(2, 0, 0, 2, 2, 3, 7, 3, 3, 2, 4);
    if (nC == 23) T = ma(2, 1, 1, 2, 3, 8, 16, 3, 2, 7, 10);
    if (nC == 24) T = ma(2, 1, 1, 2, 5, 4, 21, 3, 2, 6, 4);
    if (nC == 25) T = ma(2, 1, 1, 2, 3, 4, 10, 3, 2, 7, 12);
    if (nC == 26) T = ma(2, 1, 1, 2, 3, 7, 25, 3, 2, 4, 4);
    if (nC == 27) T = ma(2, 1, 1, 2, 3, 4, 6, 3, 2, 6, 20);
    if (nC == 28) T = ma(2, 1, 1, 2, 3, 4, 8, 3, 2, 8, 14);
    if (nC == 29) T = ma(2, 1, 1, 2, 3, 4, 6, 3, 2, 7, 28);
    if (nC == 30) T = ma(2, 1, 1, 2, 3, 4, 10, 3, 4, 8, 16);
    if (nC == 31) T = ma(2, 1, 1, 2, 3, 4, 6, 3, 2, 18, 30);
    if (nC == 32) T = ma(2, 1, 1, 1, 2, 4, 5, 2, 6, 7, 3);
    if (nC == 33) T = ma(2, 1, 1, 2, 3, 4, 6, 3, 5, 12, 32);
    if (nC == 34) T = ma(2, 1, 1, 2, 3, 4, 6, 3, 5, 12, 33);
    if (nC == 35) T = ma(2, 1, 1, 1, 2, 4, 5, 2, 6, 10, 4);
    if (nC >= 36 && nC <= 49) T = ma(1, 1, 2, 3, 4, 6);
    if (nC == 50) T = ma(2, 1, 1, 2, 3, 4, 6, 8, 11, 17, 34);
    if (nC == 51) T = ma(2, 1, 1, 2, 3, 4, 6, 8, 11, 18, 34);
    if (nC == 52) T = ma(1, 1, 2, 3, 4, 6);
    if (nC == 53) T = ma(2, 1, 1, 2, 3, 4, 6, 8, 11, 18, 36);
    if (nC == 54) T = ma(2, 1, 1, 2, 3, 4, 6, 8, 11, 17, 38);
    if (nC == 55) T = ma(2, 1, 1, 2, 3, 4, 6, 8, 12, 17, 54);
    if (nC == 56) T = ma(2, 1, 1, 2, 3, 4, 6, 8, 11, 21, 55);
    if (nC == 57) T = ma(2, 1, 1, 2, 3, 4, 6, 8, 11, 17, 41);
    if (nC == 58) T = ma(2, 1, 1, 2, 3, 4, 6, 8, 11, 17, 42);
    if (nC == 59) T = ma(2, 1, 1, 2, 3, 4, 6, 8, 11, 17, 43);
    if (nC == 60) T = ma(2, 1, 1, 2, 3, 4, 6, 8, 11, 17, 44);
    if (nC >= 61 && nC <= 160) T = ma(1, 1, 2, 3, 4, 6);
    if (nC >= 161 && nC <= 200) T = ma(2, 1, 1, 2, 3, 4, 6, 8, 11, 17, 44);
  }
  if (nL == 6) {
    if (nC == 6) T = ma(2, 2, 3, 5, 5, 5, 5, 5, 1, 1, 1, 1, 1);
    if (nC == 7) T = ma(2, 2, 3, 2, 2, 2, 2, 2, 5, 5, 5, 5, 5);
    if (nC == 8) T = ma(1, 1, 2, 2, 2, 3, 2);
    if (nC == 9) T = ma(1, 1, 2, 2, 2, 2, 4);
    if (nC == 10) T = ma(1, 1, 2, 2, 2, 3, 2);
    if (nC == 11) T = ma(1, 2, 2, 2, 3, 5, 4);
    if (nC == 12) T = ma(1, 1, 2, 2, 2, 3, 4);
    if (nC == 13) T = ma(1, 1, 2, 2, 2, 3, 5);
    if (nC == 14) T = ma(1, 1, 2, 2, 2, 3, 6);
    if (nC == 15) T = ma(1, 1, 2, 2, 2, 3, 7);
    if (nC >= 16 && nC <= 17) T = ma(1, 0, 1, 2, 2, 3, 6);
    if (nC == 18) T = ma(1, 1, 2, 2, 3, 5, 9);
    if (nC == 19) T = ma(1, 1, 2, 2, 3, 4, 9);
    if (nC == 20) T = ma(1, 1, 2, 2, 3, 4, 19);
    if (nC == 21) T = ma(1, 1, 2, 2, 3, 4, 20);
    if (nC == 22) T = ma(1, 1, 2, 2, 3, 4, 21);
    if (nC == 23) T = ma(1, 1, 2, 2, 3, 4, 22);
    if (nC == 24) T = ma(1, 1, 2, 2, 3, 6, 23);
    if (nC == 25) T = ma(1, 1, 2, 2, 3, 6, 24);
    if (nC == 26) T = ma(1, 1, 2, 2, 3, 6, 25);
    if (nC == 27) T = ma(1, 1, 2, 2, 3, 6, 26);
    if (nC == 28) T = ma(1, 1, 2, 5, 11, 4, 27);
    if (nC >= 29 && nC <= 30) T = ma(1, 0, 2, 3, 7, 15, 17);
    if (nC == 31) T = ma(1, 2, 2, 3, 7, 15, 17);
    if (nC >= 32 && nC <= 34) T = ma(1, 0, 4, 1, 2, 8, 16);
    if (nC == 35) T = ma(1, 1, 2, 3, 7, 19, 17);
    if (nC == 36) T = ma(1, 1, 2, 3, 7, 20, 17);
    if (nC == 37) T = ma(1, 1, 2, 3, 4, 10, 12);
    if (nC == 38) T = ma(1, 1, 2, 3, 4, 8, 10);
    if (nC == 39) T = ma(1, 1, 2, 3, 4, 19, 38);
    if (nC == 40 || nC == 43 || nC == 45 || (nC >= 47 && nC <= 200)) T = ma(1, 1, 2, 3, 4, 6, 8);
    if (nC == 41) T = ma(1, 1, 2, 3, 4, 6, 12);
    if (nC == 42) T = ma(1, 1, 2, 3, 4, 8, 14);
    if (nC == 44 || nC == 46) T = ma(1, 1, 2, 3, 4, 6, 11);
  }

  // j is the index into the T array, where the generator digits start
  j = T[0];
  for (i = 0; i <= 14; i++) {
    j++;
    // copy all generator digits for all supported rounds into the tg array
    tg[i] = T[j];
  }

  // var fill, posbb,
  var posb;

  // bail, if the requested number of rounds exceed the max supported rounds
  if (nR > tng) {
    if (tng > 0) {
      console.log("Can only make up to " + tng + " rounds.");
      nR = tng;
    } else {
      console.log(
        "No generators available for this choice.  Try adding a car and running a 'bye'."
      );
      // TODO: this function does not exist
      dc();
      return false;
    }
  }

  var cL, gL, dL, tI, aI;
  var h2h, hP, hC, yI;
  var gS = nL - 1;

  pgnum += 1;
  // generate an array with number of lanes-1 times number of rounds elements
  // Example: 4lanes, 7cars, 2rounds
  // gens = 3 * 2 = 6
  // Example: 4lanes, 25cars, 1rounds
  // gens = 3 * 1 = 3
  var gens = new make(gS * nR);
  // number of heats equals numnber of rounds times number of cars
  nH = nR * nC;
  // array for each car position equals number of heats times number of lanes
  pn = new make(nH * nL);
  pn2 = new make(nH * nL);
  // TODO: simplify: number of rounds times number of lanes
  // represents the number of heats a car appears in in the race
  // (on each lane in each round)
  hP = (nH * nL) / nC;
  // ?? TODO: what is this number used for
  //          seems only to be used in reporting / logging
  // Example: 4lanes, 7cars, 2rounds
  // h2h = (8 * 3) / 6 = 4
  // Example: 4lanes, 25cars, 1rounds
  // h2h = (4 * 3) / 24 = 0.5
  h2h = (hP * (nL - 1)) / (nC - 1);
  // array with length for nubmer of cars
  sums = new make(nC);

  aI = 0;
  yI = 0;

  // iterate over the number of rounds
  for (gL = 0; gL < nR; ++gL) {
    // copy the generator digits to index 1 and upwards of the gens array
    tI = aI;
    // iterate from 0 to number of lanes-1 = 0,1,2
    for (dL = 0; dL < gS; ++dL) {
      yI++;
      // first element of gens used is index 1
      // gets index 0 of tg
      gens[yI] = tg[tI++];
    }
    aI = tI;
  }

  // index for the generator array for round 1
  aI = 1;
  // pI is the index into the global array of rounds*lanes*cars
  var pI = 0;
  // iterate over the number of rounds
  for (gL = 0; gL < nR; ++gL) {
    // iterate over number of cars
    for (cL = 1; cL < nC + 1; ++cL) {
      // start by placing the current car on lane 1
      pn[pI++] = cL;
      // assign the current car number to tC
      tC = cL;
      // reset the index into the generator array to the start index
      // for this round
      tI = aI;
      // iterate over the lanes 2..n
      for (dL = 0; dL < gS; ++dL) {
        // next car is the current car + offset given by generator
        // tI is incremented as well to point to the next generator
        // digit
        tC += gens[tI++];
        // if the calculated car number exceeds the number of cars
        // in the race, then subtract the number of cars to start 
        // from the beginning again
        if (tC > nC)
          tC = tC - nC;
        // put the car number in the global array for the positions
        pn[pI++] = tC;
      }
    }
    // because tI was incremented already, it is now remembered as
    // a starting index for the next round
    aI = tI;
  }

  orderRaces();

  vtyp = cval(gens);

  if (vtyp != T[nR]) {
    console.log(
      "Apparent generator error detected. Expected type=" +
        T[nR] +
        " but computed type=" +
        vtyp +
        ".  Please Email author telling problem and values used in form."
    );
    d("Type error");
  }
  if (T[nR] == 0)
    mS = "Miscellaneous " + nC + "-" + nL + " (" + nR + " Round) Chart";
  //  mS="Partial Perfect "+nC+"-"+nL+" ("+nR+" Round) Chart with Byes"
  else if (T[nR] == 1)
    mS = "Partial Perfect " + nC + "-" + nL + " (" + nR + " Round) Chart";
  else if (T[nR] == 2) mS = "Perfect " + nC + "-" + nL + " (" + h2h + ") Chart";
  else if (T[nR] == 3)
    mS = "Complementary-Perfect " + nC + "-" + nL + " (" + h2h + ") Chart";
  else mS = "OOPS";
  d("mS: " + mS);

  var config = [];

  hC = 1; // keep track of which heat were processing
  var pI = 0; // point to start of pn array

  console.log("initial array: ");
  for (i = 0; i <= pn2.length; i++) {}

  for (gL = 0; gL < nH; ++gL) {
    posb = pI;
    var heatConf = [];
    for (cL = 0; cL < nL; ++cL) {
      console.log("" + cL + " " + pn2[pI]);
      heatConf.push(pn2[pI++]);
    }
    config.push(heatConf);
  }

  console.log(config);
  return config;
}

module.exports = {
  createRaceConfig: createRaceConfig
};
