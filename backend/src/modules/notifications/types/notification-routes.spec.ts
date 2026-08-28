import { notificationRoutes } from './notification-routes';

describe('notificationRoutes',()=>{
  it('uses the physical projects detail route',()=>{
    expect(notificationRoutes.project('project-123')).toBe('/projects/project-123');
  });

  it('uses the quote detail route',()=>{
    expect(notificationRoutes.quote('quote-123')).toBe('/quote/quote-123');
  });

  it('keeps calendar as a static route',()=>{
    expect(notificationRoutes.calendar).toBe('/calendar');
  });

  it('encodes dynamic path segments',()=>{
    expect(notificationRoutes.project('project / 123')).toBe('/projects/project%20%2F%20123');
  });
});
