exports.up = (pgm) => {
  pgm.createTable('users', {
    id: { type: 'varchar(50)', primaryKey: true },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    password: { type: 'text', notNull: true },
    role: { type: 'varchar(20)', default: 'user' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.createTable('profiles', {
    id: { type: 'varchar(50)', primaryKey: true },
    user_id: { type: 'varchar(50)', references: 'users(id)', onDelete: 'CASCADE' },
    full_name: { type: 'varchar(255)', notNull: true },
  });

  pgm.createTable('companies', {
    id: { type: 'varchar(50)', primaryKey: true },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    logo: { type: 'text' },
    website: { type: 'text' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.createTable('categories', {
    id: { type: 'varchar(50)', primaryKey: true },
    name: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.createTable('jobs', {
    id: { type: 'varchar(50)', primaryKey: true },
    company_id: { type: 'varchar(50)', references: 'companies(id)', onDelete: 'CASCADE' },
    category_id: { type: 'varchar(50)', references: 'categories(id)', onDelete: 'CASCADE' },
    title: { type: 'varchar(255)', notNull: true },
    description: { type: 'text', notNull: true },
    requirements: { type: 'text' },
    salary: { type: 'varchar(100)' },
    location: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.createTable('applications', {
    id: { type: 'varchar(50)', primaryKey: true },
    job_id: { type: 'varchar(50)', references: 'jobs(id)', onDelete: 'CASCADE' },
    user_id: { type: 'varchar(50)', references: 'users(id)', onDelete: 'CASCADE' },
    status: { type: 'varchar(20)', default: 'pending' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.createTable('bookmarks', {
    id: { type: 'varchar(50)', primaryKey: true },
    user_id: { type: 'varchar(50)', references: 'users(id)', onDelete: 'CASCADE' },
    job_id: { type: 'varchar(50)', references: 'jobs(id)', onDelete: 'CASCADE' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
  });

  pgm.createTable('authentications', {
    token: { type: 'text', notNull: true },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('authentications');
  pgm.dropTable('bookmarks');
  pgm.dropTable('applications');
  pgm.dropTable('jobs');
  pgm.dropTable('categories');
  pgm.dropTable('companies');
  pgm.dropTable('profiles');
  pgm.dropTable('users');
};