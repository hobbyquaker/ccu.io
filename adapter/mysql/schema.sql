CREATE TABLE IF NOT EXISTS `datapoints` (
  `id` int(11) NOT NULL,
  `val` text NOT NULL,
  `ack` tinyint(1) NOT NULL,
  `timestamp` datetime NOT NULL,
  `lastchange` datetime,
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `events` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `val` text NOT NULL,
  `ack` tinyint(1) NOT NULL,
  `timestamp` datetime NOT NULL,
  `lastchange` datetime,
  KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `objects` (
  `id` int(11) NOT NULL,
  `parent` int(11),
  `name` varchar(255) NOT NULL,
  `type` varchar(255),
  `info` varchar(255),
  `hssType` varchar(255),
  `address` varchar(255),
  `interface` varchar(255),
  `operations` int(11),
  `chnDirection` int(11),
  `chnType` varchar(255),
  `chnLabel` varchar(255),
  `valueMin` varchar(255),
  `valueMax` varchar(255),
  `valueUnit` varchar(255),
  `valueType` int(11),
  `valueSubType` int(11),
  `valueList` text NOT NULL,
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `refs` (
  `enum_id` int(11) NOT NULL,
  `object_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
