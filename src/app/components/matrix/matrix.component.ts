import { Component, OnInit } from '@angular/core';
import { Dot, DotColor } from '@trungk18/interface/dot';
import { Observable, combineLatest } from 'rxjs';
import { TetrisQuery } from '../../state/tetris.query';
import { untilDestroyed, UntilDestroy } from '@ngneat/until-destroy';
import { map } from 'rxjs/operators';
import { Block } from '@trungk18/interface/block/block';
import { MatrixUtil, MatrixArray } from '@trungk18/interface/utils/matrix';
import { TetrisService } from '@trungk18/state/tetris.service';
import { CallBack } from '@trungk18/interface/callback';
@UntilDestroy()
@Component({
  selector: 't-matrix',
  templateUrl: './matrix.component.html',
  styleUrls: ['./matrix.component.scss']
})
export class MatrixComponent implements OnInit {
  isOver = false;
  animatedColor: DotColor;
  linesToClear: number[];
  matrix$: Observable<MatrixArray>;

  constructor(private _query: TetrisQuery, private _service: TetrisService) {}

  ngOnInit(): void {
    this.render();
  }

  render() {
    this.matrix$ = combineLatest([
      this._query.matrix$,
      this._query.current$,
      this._query.reset$
    ]).pipe(
      untilDestroyed(this),
      map(([matrix, current, isOver]) => {
        let clearLines = MatrixUtil.linesToClear(matrix);
        setTimeout(() => {
          this.linesToClear = clearLines;
          this.isOver = isOver;
        });
        if (clearLines && !this.linesToClear) {
          this.clearAnimate();
        }

        if (!clearLines && !this.isOver && isOver) {
          return this.generateOverMatrix(matrix, current);
        }
        return this.generateMatrix(matrix, current);
      })
    );
  }

  clearAnimate() {
    let anima = (callback: CallBack) => {
      setTimeout(() => {
        this.animatedColor = DotColor.EMPTY;
        setTimeout(() => {
          this.animatedColor = DotColor.ANIMATED;
          if (typeof callback === 'function') {
            callback();
          }
        }, 100);
      }, 100);
    };
    anima(() => {
      anima(() => {
        anima(() => {
          setTimeout(() => {
            this._service.clearLines(this.linesToClear);
          }, 100);
        });
      });
    });
  }

  private generateMatrix(matrix: MatrixArray, current: Block): MatrixArray {
    let newMatrix = MatrixUtil.deepCopy(matrix);
    if (!current) {
      return newMatrix;
    }
    let { shape, xy } = current;
    if (this.linesToClear) {
      this.linesToClear.forEach((index) => {
        newMatrix[index] = [
          this.animatedColor,
          this.animatedColor,
          this.animatedColor,
          this.animatedColor,
          this.animatedColor,
          this.animatedColor,
          this.animatedColor,
          this.animatedColor,
          this.animatedColor,
          this.animatedColor
        ];
      });
    } else if (shape) {
      shape.forEach((row, k1) =>
        row.forEach((dot, k2) => {
          let isYAxisPositive = dot && xy[0] + k1 >= 0;
          if (isYAxisPositive) {
            let line = newMatrix[xy[0] + k1];
            let isMatrixAndDotCrossing = line[xy[1] + k2] === DotColor.FILLED && !this.linesToClear;
            let color = isMatrixAndDotCrossing ? DotColor.ANIMATED : DotColor.FILLED;
            line[xy[1] + k2] = color;
            newMatrix[xy[0] + k1] = line;
          }
        })
      );
    }
    return newMatrix;
  }

  private generateOverMatrix(matrix: MatrixArray, current: Block) {
    let newMatrix = this.generateMatrix(matrix, current);
    let exLine = (index: number) => {
      if (index <= 19) {
        newMatrix[19 - index] = MatrixUtil.FillLine;
      } else if (index >= 20 && index <= 39) {
        newMatrix[index - 20] = MatrixUtil.BlankLine;
      } else {
        this._service.endOver();
        return;
      }
    };

    for (let i = 0; i <= 40; i++) {
      setTimeout(exLine.bind(null, i), 40 * (i + 1));
    }
    return newMatrix;
  }

  isFilled(block: DotColor) {
    return Dot.isFilled(block);
  }
}
