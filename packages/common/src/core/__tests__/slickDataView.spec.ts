import { Aggregators } from '../../aggregators';
import { Grouping } from '../../interfaces';
import { SlickDataView } from '../slickDataview';
import 'flatpickr';

describe('SlickDatView core file', () => {
  let container: HTMLElement;
  let dv: SlickDataView;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'myGrid';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.textContent = '';
    dv.destroy();
  });

  it('should be able to instantiate SlickDataView', () => {
    dv = new SlickDataView({});

    expect(dv.getItems()).toEqual([]);
  });

  it('should be able to add items to the DataView', () => {
    const mockData = [
      { id: 1, firstName: 'John', lastName: 'Doe' },
      { id: 2, firstName: 'Jane', lastName: 'Doe' },
    ]
    dv = new SlickDataView({});
    dv.addItem(mockData[0]);
    dv.addItem(mockData[1]);

    expect(dv.getLength()).toBe(2);
    expect(dv.getItemCount()).toBe(2);
    expect(dv.getItems()).toEqual(mockData);
  });

  describe('batch CRUD methods', () => {
    afterEach(() => {
      dv.endUpdate(); // close any batch that weren't closed because of potential error thrown
      dv.destroy();
    });

    it('should batch items with addItems and begin/end batch update', () => {
      const items = [{ id: 0, name: 'John', age: 20 }, { id: 1, name: 'Jane', age: 24 }];

      dv.beginUpdate(true);
      dv.addItems(items);
      dv.endUpdate();

      expect(dv.getIdPropertyName()).toBe('id');
      expect(dv.getItems()).toEqual(items);
    });

    it('should batch more items with addItems with begin/end batch update and expect them to be inserted at the end of the dataset', () => {
      const items = [{ id: 0, name: 'John', age: 20 }, { id: 1, name: 'Jane', age: 24 }];
      const newItems = [{ id: 3, name: 'Smith', age: 30 }, { id: 4, name: 'Ronald', age: 34 }];

      dv.setItems(items); // original items list

      dv.beginUpdate(true);
      dv.addItems(newItems); // batch extra items
      dv.endUpdate();

      expect(dv.getItems()).toEqual([
        { id: 0, name: 'John', age: 20 }, { id: 1, name: 'Jane', age: 24 },
        { id: 3, name: 'Smith', age: 30 }, { id: 4, name: 'Ronald', age: 34 },
      ]);
    });

    it('should batch more items with insertItems with begin/end batch update and expect them to be inserted at the beginning of the dataset', () => {
      const items = [{ id: 0, name: 'John', age: 20 }, { id: 1, name: 'Jane', age: 24 }];
      const newItems = [{ id: 3, name: 'Smith', age: 30 }, { id: 4, name: 'Ronald', age: 34 }];

      dv.setItems(items); // original items list

      dv.beginUpdate(true);
      dv.insertItems(0, newItems); // batch extra items
      dv.endUpdate();

      expect(dv.getItems()).toEqual([
        { id: 3, name: 'Smith', age: 30 }, { id: 4, name: 'Ronald', age: 34 },
        { id: 0, name: 'John', age: 20 }, { id: 1, name: 'Jane', age: 24 }
      ]);

      dv.deleteItem(3);

      expect(dv.getItems()).toEqual([
        { id: 4, name: 'Ronald', age: 34 },
        { id: 0, name: 'John', age: 20 }, { id: 1, name: 'Jane', age: 24 }
      ]);
    });

    it('should be able to use different "id" when using setItems()', () => {
      const items = [{ keyId: 0, name: 'John', age: 20 }, { keyId: 1, name: 'Jane', age: 24 }];

      dv.beginUpdate(true);
      dv.setItems(items, 'keyId');
      dv.endUpdate();

      expect(dv.getIdPropertyName()).toBe('keyId');
      expect(dv.getItems()).toEqual(items);
    });

    it('should batch more items with insertItems with begin/end batch update and expect them to be inserted at a certain index dataset', () => {
      const items = [{ id: 0, name: 'John', age: 20 }, { id: 1, name: 'Jane', age: 24 }];
      const newItems = [{ id: 3, name: 'Smith', age: 30 }, { id: 4, name: 'Ronald', age: 34 }];

      dv.setItems(items); // original items list

      dv.beginUpdate(true);
      dv.insertItems(1, newItems); // batch extra items
      dv.endUpdate();

      expect(dv.getItems()).toEqual([
        { id: 0, name: 'John', age: 20 },
        { id: 3, name: 'Smith', age: 30 }, { id: 4, name: 'Ronald', age: 34 },
        { id: 1, name: 'Jane', age: 24 }
      ]);

      dv.deleteItems([3, 1]);

      expect(dv.getItems()).toEqual([
        { id: 0, name: 'John', age: 20 },
        { id: 4, name: 'Ronald', age: 34 },
      ]);
    });

    it('should throw when trying to delete items with have invalid Ids', () => {
      const items = [{ id: 0, name: 'John', age: 20 }, { id: 1, name: 'Jane', age: 24 }];

      dv.setItems(items); // original items list

      expect(() => dv.deleteItems([-1, 1])).toThrow('[SlickGrid DataView] Invalid id');
    });

    it('should throw when trying to delete items with a batch that have invalid Ids', () => {
      const items = [{ id: 0, name: 'John', age: 20 }, { id: 1, name: 'Jane', age: 24 }];

      dv.setItems(items); // original items list

      dv.beginUpdate(true);
      expect(() => dv.deleteItems([-1, 1])).toThrow('[SlickGrid DataView] Invalid id');
    });

    it('should call updateItems, without batch, and expect a refresh to be called', () => {
      const items = [{ id: 0, name: 'John', age: 20 }, { id: 1, name: 'Jane', age: 24 }];
      const updatedItems = [{ id: 0, name: 'Smith', age: 30 }, { id: 1, name: 'Ronald', age: 34 }];
      const refreshSpy = jest.spyOn(dv, 'refresh');

      dv.setItems(items); // original items list

      dv.updateItems(updatedItems.map(item => item.id), updatedItems);

      expect(refreshSpy).toHaveBeenCalled();
      expect(dv.getItems()).toEqual([
        { id: 0, name: 'Smith', age: 30 }, { id: 1, name: 'Ronald', age: 34 },
      ]);

      dv.deleteItem(1);

      expect(dv.getItems()).toEqual([
        { id: 0, name: 'Smith', age: 30 }
      ]);
    });

    it('should batch updateItems and expect a refresh to be called', () => {
      const items = [{ id: 0, name: 'John', age: 20 }, { id: 1, name: 'Jane', age: 24 }];
      const updatedItems = [{ id: 0, name: 'Smith', age: 30 }, { id: 1, name: 'Ronald', age: 34 }];
      const refreshSpy = jest.spyOn(dv, 'refresh');

      dv.setItems(items); // original items list

      dv.beginUpdate(true);
      dv.updateItems(updatedItems.map(item => item.id), updatedItems);

      expect(refreshSpy).toHaveBeenCalled();
      expect(dv.getItems()).toEqual([
        { id: 0, name: 'Smith', age: 30 }, { id: 1, name: 'Ronald', age: 34 },
      ]);

      dv.deleteItem(1);
      dv.endUpdate();

      expect(dv.getItems()).toEqual([
        { id: 0, name: 'Smith', age: 30 }
      ]);
    });

    it('should batch updateItems and expect a refresh to be called', () => {
      const items = [{ id: 0, name: 'John', age: 20 }, { id: 1, name: 'Jane', age: 24 }];
      const updatedItems = [{ id: 0, name: 'Smith', age: 30 }, { id: 1, name: 'Ronald', age: 34 }];
      const refreshSpy = jest.spyOn(dv, 'refresh');

      dv.setItems(items); // original items list

      dv.beginUpdate(true);
      dv.updateItems(updatedItems.map(item => item.id), updatedItems);

      expect(refreshSpy).toHaveBeenCalled();
      expect(dv.getItems()).toEqual([
        { id: 0, name: 'Smith', age: 30 }, { id: 1, name: 'Ronald', age: 34 },
      ]);

      dv.deleteItem(1);
      dv.endUpdate();

      expect(dv.getItems()).toEqual([
        { id: 0, name: 'Smith', age: 30 }
      ]);
    });

    it('should throw when batching updateItems with some invalid Ids', () => {
      const items = [{ id: 0, name: 'John', age: 20 }, { id: 1, name: 'Jane', age: 24 }];
      const updatedItems = [{ id: 0, name: 'Smith', age: 30 }, { id: 1, name: 'Ronald', age: 34 }];
      const refreshSpy = jest.spyOn(dv, 'refresh');

      dv.setItems(items); // original items list

      dv.beginUpdate(true);

      expect(() => dv.updateItems([-1, 1], updatedItems)).toThrow('[SlickGrid DataView] Invalid id');
    });

    it('should throw when trying to call setItems() with duplicate Ids', () => {
      const items = [{ id: 0, name: 'John', age: 20 }, { id: 0, name: 'Jane', age: 24 }];

      expect(() => dv.setItems(items)).toThrow(`[SlickGrid DataView] Each data element must implement a unique 'id' property`);
    });

    it('should call insertItem() at a defined index location', () => {
      const items = [{ id: 0, name: 'John', age: 20 }, { id: 1, name: 'Jane', age: 24 }];
      const newItem = { id: 2, name: 'Smith', age: 30 };
      const refreshSpy = jest.spyOn(dv, 'refresh');

      dv.setItems(items);
      dv.insertItem(1, newItem);

      expect(refreshSpy).toHaveBeenCalled();
      expect(dv.getItems()).toEqual([
        { id: 0, name: 'John', age: 20 },
        { id: 2, name: 'Smith', age: 30 },
        { id: 1, name: 'Jane', age: 24 }
      ]);
    });

    it('should throw when trying to call insertItem() with undefined Id', () => {
      const items = [{ id: 0, name: 'John', age: 20 }, { id: 1, name: 'Jane', age: 24 }];
      const newItem = { id: undefined, name: 'Smith', age: 30 };

      dv.setItems(items);
      expect(() => dv.insertItem(1, newItem)).toThrow(`[SlickGrid DataView] Each data element must implement a unique 'id' property`);
    });

    it('should throw when trying to call insertItem() with undefined Id', () => {
      const items = [
        { id: 0, name: 'John', age: 20 },
        { id: 1, name: 'Jane', age: 24 },
        { id: undefined, name: 'Smith', age: 30 }];

      dv.beginUpdate(true);
      dv.setItems(items);
      expect(() => dv.endUpdate()).toThrow(`[SlickGrid DataView] Each data element must implement a unique 'id' property`);
    });
  });

  describe('Grouping', () => {
    it('should call setGrouping() and expect grouping to be defined without any accumulator neither totals when Aggregators are omitted', () => {
      const mockData = [
        { id: 1, firstName: 'John', lastName: 'Doe' },
        { id: 2, firstName: 'Jane', lastName: 'Doe' },
      ]
      dv = new SlickDataView({});
      const refreshSpy = jest.spyOn(dv, 'refresh');
      dv.setItems(mockData);

      const agg = new Aggregators.Sum('lastName');
      dv.setGrouping({
        getter: 'lastName',
        formatter: (g) => `Family: ${g.value} <span class="text-green">(${g.count} items)</span>`,
      } as Grouping);

      expect(refreshSpy).toHaveBeenCalled();
      expect(dv.getGrouping().length).toBe(1);
      expect(dv.getGrouping()[0]).toMatchObject({ aggregators: [], getter: 'lastName' });

      expect(dv.getItem(0)).toEqual({
        __group: true,
        __nonDataRow: true,
        collapsed: 0,
        count: 2,
        groupingKey: 'Doe',
        groups: null,
        level: 0,
        rows: mockData,
        selectChecked: false,
        title: 'Family: Doe <span class="text-green">(2 items)</span>',
        totals: null,
        value: 'Doe'
      });
      expect(dv.getItem(1)).toEqual(mockData[0]);
      expect(dv.getItem(2)).toEqual(mockData[1]);
      expect(dv.getItem(3)).toBeUndefined(); // without Totals
    });

    it('should call setGrouping() and expect grouping to be defined with compiled accumulator and totals when providing Aggregators', () => {
      const mockData = [
        { id: 1, firstName: 'John', lastName: 'Doe' },
        { id: 2, firstName: 'Jane', lastName: 'Doe' },
      ]
      dv = new SlickDataView({});
      const refreshSpy = jest.spyOn(dv, 'refresh');
      dv.setItems(mockData);

      const agg = new Aggregators.Sum('lastName');
      dv.setGrouping({
        getter: 'lastName',
        formatter: (g) => `Family: ${g.value} <span class="text-green">(${g.count} items)</span>`,
        aggregators: [agg],
        aggregateCollapsed: false,
      } as Grouping);

      expect(refreshSpy).toHaveBeenCalled();
      expect(dv.getGrouping().length).toBe(1);
      expect(dv.getGrouping()[0]).toMatchObject({ aggregators: [agg], getter: 'lastName' });

      expect(dv.getItem(0)).toEqual({
        __group: true,
        __nonDataRow: true,
        collapsed: 0,
        count: 2,
        groupingKey: 'Doe',
        groups: null,
        level: 0,
        rows: mockData,
        selectChecked: false,
        title: 'Family: Doe <span class="text-green">(2 items)</span>',
        totals: expect.anything(),
        value: 'Doe'
      });
      expect(dv.getItem(1)).toEqual(mockData[0]);
      expect(dv.getItem(2)).toEqual(mockData[1]);
      expect(dv.getItem(3)).toEqual({
        __groupTotals: true,
        __nonDataRow: true,
        group: expect.anything(),
        initialized: true,
        sum: { lastName: 0 }
      });
    });
  });
});