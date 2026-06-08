exports.up = (pgm) => {
  pgm.createTable('bookmarks', {
    id: { type: 'varchar(50)', primaryKey: true },
    user_id: { type: 'varchar(50)', references: 'users(id)', onDelete: 'CASCADE' },
    job_id: { type: 'varchar(50)', references: 'jobs(id)', onDelete: 'CASCADE' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('bookmarks');
};